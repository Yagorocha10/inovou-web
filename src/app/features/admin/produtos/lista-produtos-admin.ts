import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, finalize, map, skip, switchMap, takeUntil, timer } from 'rxjs';
import { mensagemDeErro } from '../../../core/erro-api';
import { FiltroProdutosAdmin, ProdutoAdmin, SituacaoProduto } from '../../../core/models/admin';
import { Categoria } from '../../../core/models/catalogo';
import { CategoriaService } from '../../../core/services/categoria.service';
import { AdminProdutosService } from '../../../core/services/admin-produtos.service';

const TAMANHO_PAGINA = 10;

function situacaoValida(valor: string | null): SituacaoProduto {
  return valor === 'ATIVOS' || valor === 'INATIVOS' ? valor : 'TODOS';
}

function numeroInteiro(valor: string | null, padrao = 0): number {
  if (valor === null || !/^\d+$/.test(valor)) {
    return padrao;
  }
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero >= 0 ? numero : padrao;
}

@Component({
  selector: 'app-lista-produtos-admin',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './lista-produtos-admin.html',
  styleUrl: './lista-produtos-admin.scss',
})
export class ListaProdutosAdmin {
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly adminProdutos = inject(AdminProdutosService);
  private readonly categoriaService = inject(CategoriaService);

  protected readonly busca = new FormControl('', { nonNullable: true });
  protected readonly categoriaControl = new FormControl('', { nonNullable: true });
  protected readonly situacaoControl = new FormControl<SituacaoProduto>('TODOS', { nonNullable: true });
  private readonly parametros = toSignal(this.rota.queryParamMap, {
    initialValue: this.rota.snapshot.queryParamMap,
  });

  protected readonly categoriasResource = rxResource<Categoria[], true>({
    params: () => true,
    stream: () => this.categoriaService.listar(),
  });
  protected readonly categorias = computed(() =>
    this.categoriasResource.hasValue() ? this.categoriasResource.value() : [],
  );
  protected readonly erroCategorias = computed(() =>
    mensagemDeErro(
      this.categoriasResource.error(),
      'Não foi possível carregar as categorias. Tente novamente.',
    ),
  );
  private readonly categoriasCarregadas = computed(() => this.categoriasResource.hasValue());

  protected readonly categoriaId = computed(() => {
    const valor = this.parametros().get('categoriaId');
    return valor === null ? undefined : numeroInteiro(valor, -1) >= 0 ? numeroInteiro(valor, -1) : undefined;
  });
  protected readonly situacao = computed(() => situacaoValida(this.parametros().get('situacao')));
  protected readonly pagina = computed(() => numeroInteiro(this.parametros().get('pagina')));
  protected readonly buscaAtual = computed(() => this.parametros().get('busca')?.trim() ?? '');

  protected readonly filtro = computed<FiltroProdutosAdmin>(() => ({
    busca: this.buscaAtual() || undefined,
    categoriaId: this.categoriaId(),
    situacao: this.situacao(),
    pagina: this.pagina(),
    tamanho: TAMANHO_PAGINA,
  }));

  protected readonly produtos = rxResource({
    params: () => this.filtro(),
    stream: ({ params }) => this.adminProdutos.listar(params),
  });

  protected readonly erroCarregamento = computed(() =>
    mensagemDeErro(
      this.produtos.error(),
      'Não foi possível carregar os produtos. Confira sua conexão e tente novamente.',
    ),
  );

  private readonly atualizacoes = signal(new Map<number, ProdutoAdmin>());
  private readonly atualizando = signal(new Set<number>());
  protected readonly feedback = signal<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  protected readonly itens = computed(() => {
    if (!this.produtos.hasValue()) {
      return [];
    }
    const atualizados = this.atualizacoes();
    return this.produtos.value().itens.map((produto) => atualizados.get(produto.id) ?? produto);
  });

  protected readonly filtrosAtivos = computed(
    () => !!this.buscaAtual() || this.categoriaId() !== undefined || this.situacao() !== 'TODOS',
  );

  protected readonly paginaForaDoIntervalo = computed(() => {
    if (!this.produtos.hasValue()) {
      return false;
    }
    const totalPaginas = this.produtos.value().totalPaginas;
    return totalPaginas === 0 ? this.pagina() > 0 : this.pagina() >= totalPaginas;
  });

  private ultimaChaveFiltro: string | null = null;

  constructor() {
    effect(() => {
      const precisaDesabilitar =
        this.categoriasResource.isLoading() || !!this.categoriasResource.error();
      if (precisaDesabilitar && this.categoriaControl.enabled) {
        this.categoriaControl.disable({ emitEvent: false });
      } else if (!precisaDesabilitar && this.categoriaControl.disabled) {
        this.categoriaControl.enable({ emitEvent: false });
      }
    });

    effect(() => {
      const buscaNaUrl = this.buscaAtual();
      if (this.busca.value !== buscaNaUrl) {
        this.busca.setValue(buscaNaUrl, { emitEvent: false });
      }
      const categoriaNaUrl = this.categoriaId()?.toString() ?? '';
      if (this.categoriaControl.value !== categoriaNaUrl) {
        this.categoriaControl.setValue(categoriaNaUrl, { emitEvent: false });
      }
      const situacaoNaUrl = this.situacao();
      if (this.situacaoControl.value !== situacaoNaUrl) {
        this.situacaoControl.setValue(situacaoNaUrl, { emitEvent: false });
      }
    });

    effect(() => this.normalizarParametrosDaUrl());

    effect(() => {
      if (this.produtos.isLoading() || this.produtos.error() || !this.produtos.hasValue()) {
        return;
      }
      const totalPaginas = this.produtos.value().totalPaginas;
      const solicitada = this.pagina();
      const ultimaValida = Math.max(totalPaginas - 1, 0);
      const paginaValida = Math.min(solicitada, ultimaValida);
      if (paginaValida !== solicitada) {
        this.normalizarQuery({ pagina: paginaValida === 0 ? null : String(paginaValida) });
      }
    });

    effect(() => {
      const chaveAtual = JSON.stringify(this.filtro());
      if (chaveAtual !== this.ultimaChaveFiltro) {
        this.ultimaChaveFiltro = chaveAtual;
        this.atualizacoes.set(new Map());
      }
    });

    this.busca.valueChanges
      .pipe(
        switchMap((valor) =>
          timer(300).pipe(
            takeUntil(this.rota.queryParamMap.pipe(skip(1))),
            map(() => valor.trim()),
          ),
        ),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((valor) => {
        this.navegar({ busca: valor || null, pagina: null });
      });
  }

  protected alterarCategoria(valor: string): void {
    this.navegar({ categoriaId: valor ? Number(valor) : null, pagina: null });
  }

  protected alterarSituacao(valor: SituacaoProduto): void {
    this.navegar({ situacao: valor === 'TODOS' ? null : valor, pagina: null });
  }

  protected irParaPagina(pagina: number): void {
    this.navegar({ pagina: pagina === 0 ? null : pagina });
  }

  protected imagemPrincipal(produto: ProdutoAdmin): string | null {
    return [...produto.imagens].sort((a, b) => a.ordem - b.ordem)[0]?.url ?? null;
  }

  protected estaAtualizando(id: number): boolean {
    return this.atualizando().has(id);
  }

  protected alternarAtivo(produto: ProdutoAdmin): void {
    if (this.estaAtualizando(produto.id)) {
      return;
    }

    this.feedback.set(null);
    const chaveFiltro = JSON.stringify(this.filtro());
    this.atualizando.update((ids) => new Set(ids).add(produto.id));
    this.adminProdutos
      .atualizarAtivo(produto.id, !produto.ativo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() =>
          this.atualizando.update((ids) => {
            const novosIds = new Set(ids);
            novosIds.delete(produto.id);
            return novosIds;
          }),
        ),
      )
      .subscribe({
        next: (atualizado) => {
          if (chaveFiltro === JSON.stringify(this.filtro())) {
            const saiuDoFiltro =
              (this.situacao() === 'ATIVOS' && !atualizado.ativo) ||
              (this.situacao() === 'INATIVOS' && atualizado.ativo);
            if (saiuDoFiltro) {
              this.atualizacoes.set(new Map());
              this.produtos.reload();
            } else {
              this.atualizacoes.update((mapa) => new Map(mapa).set(atualizado.id, atualizado));
            }
          }
          this.feedback.set({
            tipo: 'sucesso',
            texto: atualizado.ativo ? 'Produto ativado com sucesso.' : 'Produto desativado com sucesso.',
          });
        },
        error: (erro: unknown) =>
          this.feedback.set({
            tipo: 'erro',
            texto: mensagemDeErro(erro, 'Não foi possível alterar a situação do produto.'),
          }),
      });
  }

  protected tentarNovamente(): void {
    this.atualizacoes.set(new Map());
    this.produtos.reload();
  }

  protected tentarCarregarCategoriasNovamente(): void {
    this.categoriasResource.reload();
  }

  private normalizarParametrosDaUrl(): void {
    const parametros = this.parametros();
    const correcoes: Record<string, string | null> = {};
    let precisaCorrigir = false;

    const busca = parametros.get('busca');
    if (busca !== null) {
      const buscaNormalizada = busca.trim() || null;
      if (busca !== buscaNormalizada) {
        correcoes['busca'] = buscaNormalizada;
        precisaCorrigir = true;
      }
    }

    const situacao = parametros.get('situacao');
    if (situacao !== null && situacao !== 'TODOS' && situacao !== 'ATIVOS' && situacao !== 'INATIVOS') {
      correcoes['situacao'] = null;
      precisaCorrigir = true;
    }

    const pagina = parametros.get('pagina');
    if (pagina !== null) {
      const paginaNormalizada = numeroInteiro(pagina, -1);
      const valorNormalizado = paginaNormalizada <= 0 ? null : String(paginaNormalizada);
      if (valorNormalizado !== pagina) {
        correcoes['pagina'] = valorNormalizado;
        precisaCorrigir = true;
      }
    }

    const categoriaId = parametros.get('categoriaId');
    if (categoriaId !== null && this.categoriasCarregadas()) {
      const id = numeroInteiro(categoriaId, -1);
      const categoriaValida = id >= 0 && this.categorias().some((categoria) => categoria.id === id);
      const valorNormalizado = categoriaValida ? String(id) : null;
      if (valorNormalizado !== categoriaId) {
        correcoes['categoriaId'] = valorNormalizado;
        precisaCorrigir = true;
      }
    }

    if (precisaCorrigir) {
      this.normalizarQuery(correcoes);
    }
  }

  private normalizarQuery(queryParams: Record<string, string | null>): void {
    const atuais = this.parametros();
    if (Object.entries(queryParams).every(([chave, valor]) => atuais.get(chave) === valor)) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.rota,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private navegar(queryParams: Record<string, string | number | null>): void {
    this.feedback.set(null);
    void this.router.navigate([], {
      relativeTo: this.rota,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
