import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FiltroProdutos, ORDENACOES, OrdenacaoProduto } from '../../../core/models/catalogo';
import { CategoriaService } from '../../../core/services/categoria.service';
import { ProdutoService } from '../../../core/services/produto.service';
import { CardProduto } from '../../../shared/components/card-produto/card-produto';

const TAMANHO_PAGINA = 12;

function paraNumeroDePagina(valor: unknown): number {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : 0;
}

@Component({
  selector: 'app-catalogo',
  imports: [RouterLink, CardProduto],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
})
export class Catalogo {
  private readonly router = inject(Router);
  private readonly produtoService = inject(ProdutoService);
  private readonly categoriaService = inject(CategoriaService);

  readonly busca = input<string>();
  readonly categoria = input<string>();
  readonly ordenacao = input<string>();
  readonly pagina = input(0, { transform: paraNumeroDePagina });

  protected readonly ordenacoes = ORDENACOES;
  protected readonly esqueletos = [1, 2, 3, 4, 5, 6];

  protected readonly ordenacaoAtual = computed<OrdenacaoProduto>(() => {
    const valor = this.ordenacao();
    return ORDENACOES.some((o) => o.valor === valor)
      ? (valor as OrdenacaoProduto)
      : 'MAIS_RECENTES';
  });

  protected readonly filtro = computed<FiltroProdutos>(() => ({
    busca: this.busca()?.trim() ?? '',
    categoria: this.categoria() ?? '',
    ordenacao: this.ordenacaoAtual(),
    pagina: this.pagina(),
    tamanho: TAMANHO_PAGINA,
  }));

  protected readonly produtos = rxResource({
    params: () => this.filtro(),
    stream: ({ params }) => this.produtoService.buscar(params),
  });

  protected readonly categorias = rxResource({
    stream: () => this.categoriaService.listar(),
  });

  protected readonly categoriaAtual = computed(() => {
    const slug = this.categoria();
    return this.categorias.value()?.find((c) => c.slug === slug);
  });

  protected readonly titulo = computed(() => {
    const busca = this.filtro().busca;
    if (busca) {
      return `Resultados para “${busca}”`;
    }
    return this.categoriaAtual()?.nome ?? 'Todos os produtos';
  });

  protected readonly paginas = computed(() => {
    const total = this.produtos.value()?.totalPaginas ?? 0;
    return Array.from({ length: total }, (_, indice) => indice);
  });

  protected navegar(queryParams: Record<string, string | number | null>): void {
    this.router.navigate(['/produtos'], { queryParams, queryParamsHandling: 'merge' });
  }

  protected alterarOrdenacao(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.navegar({ ordenacao: valor === 'MAIS_RECENTES' ? null : valor, pagina: null });
  }

  protected irParaPagina(pagina: number): void {
    this.navegar({ pagina: pagina === 0 ? null : pagina });
  }
}
