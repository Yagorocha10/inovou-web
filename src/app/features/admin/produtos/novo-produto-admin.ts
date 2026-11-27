import { Component, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { camposComErro, mensagemDeErro } from '../../../core/erro-api';
import { Categoria } from '../../../core/models/catalogo';
import { DadosProduto, ProdutoAdmin } from '../../../core/models/admin';
import { AdminProdutosService } from '../../../core/services/admin-produtos.service';
import { CategoriaService } from '../../../core/services/categoria.service';
import { ConfirmavelAoSair } from '../../../core/guards/alteracoes-nao-salvas.guard';
import { criarFormularioProdutoAdmin, FormularioProdutoAdmin } from './formulario-produto-admin';

@Component({
  selector: 'app-novo-produto-admin',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './novo-produto-admin.html',
  styleUrl: './novo-produto-admin.scss',
})
export class NovoProdutoAdmin implements ConfirmavelAoSair {
  private readonly router = inject(Router);
  private readonly produtosService = inject(AdminProdutosService);
  private readonly categoriaService = inject(CategoriaService);

  protected readonly enviando = signal(false);
  protected readonly cadastroConcluido = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly errosServidor = signal<Record<string, string>>({});

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

  constructor() {
    effect(() => {
      if (this.categorias.hasValue()) {
        this.categorias.value();
        this.formulario.controls.categoriaId.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  podeSair(): boolean {
    if (this.cadastroConcluido() || !this.formulario.dirty) {
      return true;
    }
    return window.confirm('Há alterações não salvas. Deseja sair desta página?');
  }

  protected cadastrar(): void {
    if (this.enviando()) {
      return;
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    if (!this.categorias.hasValue()) {
      this.erro.set('Aguarde o carregamento das categorias antes de salvar.');
      return;
    }

    const valores = this.formulario.getRawValue();
    const dados: DadosProduto = {
      nome: valores.nome.trim(),
      descricao: valores.descricao.trim(),
      preco: valores.preco!,
      estoque: valores.estoque!,
      categoriaId: valores.categoriaId!,
      ativo: valores.ativo,
    };

    this.erro.set(null);
    this.errosServidor.set({});
    this.enviando.set(true);
    this.produtosService.criar(dados).subscribe({
      next: (produto: ProdutoAdmin) => {
        this.cadastroConcluido.set(true);
        void this.router.navigateByUrl(`/admin/produtos/${produto.id}`, {
          state: { produtoCadastrado: true },
        });
      },
      error: (falha: unknown) => {
        this.erro.set(this.mensagemDoErro(falha));
        this.errosServidor.set(camposComErro(falha));
        this.enviando.set(false);
      },
    });
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

  private mensagemDoErro(falha: unknown): string {
    if (falha instanceof HttpErrorResponse && falha.status === 409) {
      return 'Já existe um produto cadastrado com este nome.';
    }
    const padrao =
      falha instanceof HttpErrorResponse && falha.status === 400
        ? 'Revise os campos destacados e tente novamente.'
        : 'Não foi possível cadastrar o produto. Tente novamente.';
    return mensagemDeErro(falha, padrao);
  }
}

