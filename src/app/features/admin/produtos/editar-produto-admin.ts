import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Location } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, finalize, map, take } from 'rxjs';
import { camposComErro, mensagemDeErro } from '../../../core/erro-api';
import { ConfirmavelAoSair } from '../../../core/guards/alteracoes-nao-salvas.guard';
import { DadosProduto, ImagemAdmin, ProdutoAdmin } from '../../../core/models/admin';
import { Categoria } from '../../../core/models/catalogo';
import { AdminProdutosService } from '../../../core/services/admin-produtos.service';
import { CategoriaService } from '../../../core/services/categoria.service';
import { criarFormularioProdutoAdmin, FormularioProdutoAdmin } from './formulario-produto-admin';

const TAMANHO_MAXIMO_ARQUIVO = 5 * 1024 * 1024;
const LIMITE_IMAGENS = 8;
const TIPO_POR_EXTENSAO: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function idPositivo(valor: string | null): number | null {
  if (!valor || !/^\d+$/.test(valor)) {
    return null;
  }
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

@Component({
  selector: 'app-editar-produto-admin',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './editar-produto-admin.html',
  styleUrl: './editar-produto-admin.scss',
})
export class EditarProdutoAdmin implements ConfirmavelAoSair {
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly produtosService = inject(AdminProdutosService);
  private readonly categoriaService = inject(CategoriaService);

  protected readonly id = toSignal(
    this.rota.paramMap.pipe(map((parametros) => idPositivo(parametros.get('id')))),
    { initialValue: idPositivo(this.rota.snapshot.paramMap.get('id')) },
  );

  protected readonly produtoResource = rxResource({
    params: () => {
      const id = this.id();
      return id === null ? undefined : { id };
    },
    stream: ({ params }) => this.produtosService.buscar(params.id),
  });

  protected readonly categorias = rxResource<Categoria[], true>({
    params: () => true,
    stream: () => this.categoriaService.listar(),
  });

  private readonly categoriaValida: ValidatorFn = (control) => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return null;
    }
    if (!this.categorias.hasValue()) {
      return { categoriaInvalida: true };
    }
    return this.categorias.value().some((categoria) => categoria.id === control.value)
      ? null
      : { categoriaInvalida: true };
  };

  protected readonly formulario = criarFormularioProdutoAdmin(this.categoriaValida);
  protected readonly produto = signal<ProdutoAdmin | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly errosServidor = signal<Record<string, string>>({});
  protected readonly feedback = signal<string | null>(null);
  protected readonly erroGaleria = signal<string | null>(null);
  protected readonly progressoUpload = signal(0);
  protected readonly arquivoEmEnvio = signal<string | null>(null);
  protected readonly filaUpload = signal<File[]>([]);
  protected readonly enviandoImagens = signal(false);
  protected readonly operacaoGaleria = signal(false);
  protected readonly imagensOrdenadas = computed(() =>
    [...(this.produto()?.imagens ?? [])].sort((a, b) => a.ordem - b.ordem),
  );
  protected readonly principal = computed(
    () => this.imagensOrdenadas().find((imagem) => imagem.ordem === 0) ?? null,
  );
  protected readonly produtoNaoEncontrado = computed(
    () => this.produtoResource.error() instanceof HttpErrorResponse &&
      (this.produtoResource.error() as HttpErrorResponse).status === 404,
  );

  private dadosOriginais: DadosProduto | null = null;
  private idCarregado: number | null = null;
  protected readonly cadastroConfirmado =
    this.router.getCurrentNavigation()?.extras.state?.['produtoCadastrado'] === true;

  constructor() {
    effect(() => {
      if (this.categorias.hasValue()) {
        this.categorias.value();
        this.formulario.controls.categoriaId.updateValueAndValidity({ emitEvent: false });
      }
    });

    effect(() => {
      if (this.produtoResource.isLoading() || !this.produtoResource.hasValue()) {
        return;
      }
      const carregado = this.produtoResource.value();
      if (carregado.id !== this.id() || carregado.id === this.idCarregado) {
        return;
      }
      this.idCarregado = carregado.id;
      this.produto.set(carregado);
      const dados = this.dadosDoProduto(carregado);
      this.dadosOriginais = dados;
      this.formulario.reset(dados, { emitEvent: false });
      this.formulario.markAsPristine();
      this.formulario.markAsUntouched();
    });

    if (this.cadastroConfirmado) {
      this.router.events
        .pipe(
          filter((evento) => evento instanceof NavigationEnd),
          take(1),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => {
          const estado = { ...(this.location.getState() as Record<string, unknown>) };
          delete estado['produtoCadastrado'];
          this.location.replaceState(this.location.path(), '', estado);
        });
    }
  }

  podeSair(): boolean {
    if (!this.formulario.dirty && !this.galeriaOcupada()) {
      return true;
    }
    return window.confirm('Há alterações ou operações em andamento. Deseja sair desta página?');
  }

  protected tentarCarregarNovamente(): void {
    this.produtoResource.reload();
  }

  protected tentarCarregarCategoriasNovamente(): void {
    this.categorias.reload();
  }

  protected campoInvalido(campo: keyof FormularioProdutoAdmin): boolean {
    const controle = this.formulario.controls[campo];
    return controle.invalid && controle.touched;
  }

  protected erroDoCampo(campo: keyof FormularioProdutoAdmin): string | null {
    const controle = this.formulario.controls[campo];
    if (controle.hasError('required')) {
      return 'Este campo é obrigatório.';
    }
    if (controle.hasError('categoriaInvalida')) {
      return 'Selecione uma categoria válida.';
    }
    if (controle.hasError('maxlength')) {
      return campo === 'nome'
        ? 'O nome deve ter no máximo 150 caracteres.'
        : 'A descrição deve ter no máximo 2.000 caracteres.';
    }
    if (controle.hasError('min')) {
      return campo === 'preco' ? 'O preço deve ser maior que zero.' : 'O estoque não pode ser negativo.';
    }
    if (controle.hasError('pattern')) {
      return campo === 'preco'
        ? 'Informe um preço com no máximo duas casas decimais.'
        : 'O estoque deve ser um número inteiro.';
    }
    return null;
  }

  protected erroServidor(campo: keyof FormularioProdutoAdmin): string | undefined {
    return this.errosServidor()[campo];
  }

  protected salvar(): void {
    if (this.salvando() || this.galeriaOcupada()) {
      return;
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const id = this.id();
    const valores = this.formulario.getRawValue();
    const dados: DadosProduto = {
      nome: valores.nome.trim(),
      descricao: valores.descricao.trim(),
      preco: valores.preco!,
      estoque: valores.estoque!,
      categoriaId: valores.categoriaId!,
      ativo: valores.ativo,
    };
    if (id === null || !this.produto() || !this.dadosOriginais) {
      return;
    }
    if (JSON.stringify(dados) === JSON.stringify(this.dadosOriginais)) {
      this.formulario.markAsPristine();
      this.feedback.set('Nenhuma alteração para salvar.');
      return;
    }

    this.erro.set(null);
    this.errosServidor.set({});
    this.feedback.set(null);
    this.salvando.set(true);
    this.produtosService
      .atualizar(id, dados)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (atualizado) => {
          this.aplicarProduto(atualizado, true);
          this.feedback.set('Alterações salvas com sucesso.');
          this.salvando.set(false);
        },
        error: (falha: unknown) => {
          this.erro.set(this.mensagemDaFalha(falha, 'Não foi possível salvar as alterações.'));
          this.errosServidor.set(camposComErro(falha));
          this.salvando.set(false);
        },
      });
  }

  protected selecionarArquivos(evento: Event): void {
    if (this.galeriaOcupada()) {
      return;
    }
    const input = evento.target as HTMLInputElement;
    const arquivos = Array.from(input.files ?? []);
    input.value = '';
    this.erroGaleria.set(null);
    const imagensAtuais = this.produto()?.imagens.length ?? 0;
    const emEnvio = this.enviandoImagens() ? 1 : 0;
    let restantes = LIMITE_IMAGENS - imagensAtuais - this.filaUpload().length - emEnvio;
    const aceitos: File[] = [];

    for (const arquivo of arquivos) {
      if (!this.tipoPermitido(arquivo)) {
        this.erroGaleria.set('Selecione arquivos JPG, PNG ou WEBP.');
      } else if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
        this.erroGaleria.set('O arquivo ultrapassa o limite permitido de 5 MB.');
      } else if (restantes <= 0) {
        this.erroGaleria.set('Cada produto pode ter no máximo 8 imagens.');
      } else {
        aceitos.push(arquivo);
        restantes--;
      }
    }

    if (aceitos.length) {
      this.filaUpload.update((fila) => [...fila, ...aceitos]);
      this.enviarProximaImagem();
    }
  }

  protected removerImagem(imagem: ImagemAdmin): void {
    const produto = this.produto();
    if (!produto || this.galeriaOcupada()) {
      return;
    }
    if (!window.confirm('Deseja remover esta imagem do produto?')) {
      return;
    }
    this.erroGaleria.set(null);
    this.operacaoGaleria.set(true);
    this.produtosService
      .removerImagem(produto.id, imagem.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.operacaoGaleria.set(false)),
      )
      .subscribe({
        next: (atualizado) => this.aplicarProduto(atualizado),
        error: (falha: unknown) =>
          this.erroGaleria.set(this.mensagemDaFalha(falha, 'Não foi possível remover a imagem.')),
      });
  }

  protected moverImagem(indice: number, deslocamento: -1 | 1): void {
    const produto = this.produto();
    const ordenadas = this.imagensOrdenadas();
    const destino = indice + deslocamento;
    if (!produto || this.galeriaOcupada() || destino < 0 || destino >= ordenadas.length) {
      return;
    }
    const novas = [...ordenadas];
    const [imagem] = novas.splice(indice, 1);
    novas.splice(destino, 0, imagem);
    this.erroGaleria.set(null);
    this.operacaoGaleria.set(true);
    this.produtosService
      .ordenarImagens(produto.id, novas.map((item) => item.id))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.operacaoGaleria.set(false)),
      )
      .subscribe({
        next: (atualizado) => this.aplicarProduto(atualizado),
        error: (falha: unknown) =>
          this.erroGaleria.set(this.mensagemDaFalha(falha, 'Não foi possível alterar a ordem das imagens.')),
      });
  }

  protected galeriaOcupada(): boolean {
    return this.salvando() || this.enviandoImagens() || this.operacaoGaleria();
  }

  protected mensagemDaFalha(falha: unknown, padrao: string): string {
    if (falha instanceof HttpErrorResponse && falha.status === 413) {
      return 'O arquivo ultrapassa o limite permitido de 5 MB.';
    }
    if (falha instanceof HttpErrorResponse && falha.status === 409) {
      return 'Já existe um produto cadastrado com este nome.';
    }
    return mensagemDeErro(falha, padrao);
  }

  private enviarProximaImagem(): void {
    if (this.destroyRef.destroyed || this.enviandoImagens() || this.operacaoGaleria()) {
      return;
    }
    const produto = this.produto();
    const [arquivo, ...restantes] = this.filaUpload();
    if (!produto || !arquivo) {
      this.enviandoImagens.set(false);
      this.arquivoEmEnvio.set(null);
      return;
    }

    this.filaUpload.set(restantes);
    this.enviandoImagens.set(true);
    this.arquivoEmEnvio.set(arquivo.name);
    this.progressoUpload.set(0);
    this.produtosService
      .enviarImagem(produto.id, arquivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (evento) => {
          if (evento.type === HttpEventType.UploadProgress) {
            this.progressoUpload.set(
              evento.total ? Math.round((evento.loaded / evento.total) * 100) : 0,
            );
          } else if (evento.type === HttpEventType.Response && evento.body) {
            this.aplicarProduto(evento.body);
            this.progressoUpload.set(100);
          }
        },
        error: (falha: unknown) => {
          this.erroGaleria.set(this.mensagemDaFalha(falha, 'Não foi possível enviar a imagem.'));
          this.enviandoImagens.set(false);
          this.arquivoEmEnvio.set(null);
          this.enviarProximaImagem();
        },
        complete: () => {
          this.enviandoImagens.set(false);
          this.arquivoEmEnvio.set(null);
          this.enviarProximaImagem();
        },
      });
  }

  private aplicarProduto(produto: ProdutoAdmin, atualizarFormulario = false): void {
    this.produto.set(produto);
    if (atualizarFormulario) {
      const dados = this.dadosDoProduto(produto);
      this.dadosOriginais = dados;
      this.formulario.reset(dados, { emitEvent: false });
      this.formulario.markAsPristine();
      this.formulario.markAsUntouched();
    }
  }

  private dadosDoProduto(produto: ProdutoAdmin): DadosProduto {
    return {
      nome: produto.nome,
      descricao: produto.descricao,
      preco: produto.preco,
      estoque: produto.estoque,
      categoriaId: produto.categoria.id,
      ativo: produto.ativo,
    };
  }

  private tipoPermitido(arquivo: File): boolean {
    const extensao = arquivo.name.split('.').pop()?.toLowerCase() ?? '';
    const tipoEsperado = TIPO_POR_EXTENSAO[extensao];
    return !!tipoEsperado && (!arquivo.type || arquivo.type === tipoEsperado);
  }
}
