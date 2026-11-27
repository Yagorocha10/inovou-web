import { SlicePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Categoria } from '../../../core/models/catalogo';
import { AvaliacaoService } from '../../../core/services/avaliacao.service';
import { CategoriaService } from '../../../core/services/categoria.service';
import { ProdutoService } from '../../../core/services/produto.service';
import { CardProduto } from '../../../shared/components/card-produto/card-produto';

interface Vantagem {
  icone: string;
  titulo: string;
  texto: string;
}

const ORDEM_DOS_BLOCOS = [
  'eletronicos',
  'games',
  'ferramentas',
  'audio',
  'acessorios',
  'utilidades',
];

const ICONES_CATEGORIA: Record<string, string> = {
  eletronicos: 'devices',
  games: 'sports_esports',
  ferramentas: 'construction',
  audio: 'headphones',
  acessorios: 'cable',
  utilidades: 'home_repair_service',
};

@Component({
  selector: 'app-home',
  imports: [RouterLink, CardProduto, MatIconModule, SlicePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly produtoService = inject(ProdutoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly avaliacaoService = inject(AvaliacaoService);

  protected readonly destaques = rxResource({
    stream: () => this.produtoService.destaques(8),
  });

  protected readonly ofertas = rxResource({
    stream: () =>
      this.produtoService
        .buscar({ ofertas: true, tamanho: 24 })
        .pipe(
          catchError(() =>
            of({ itens: [], pagina: 0, tamanho: 24, totalItens: 0, totalPaginas: 0 }),
          ),
        ),
  });

  protected readonly maisEmConta = rxResource({
    stream: () => this.produtoService.buscar({ ordenacao: 'MENOR_PRECO', tamanho: 4 }),
  });

  protected readonly maisVendidos = rxResource({
    stream: () => this.produtoService.maisVendidos(4).pipe(catchError(() => of([]))),
  });

  protected readonly games = rxResource({
    stream: () =>
      this.produtoService.buscar({ categoria: 'games', ordenacao: 'MAIS_RECENTES', tamanho: 4 }),
  });

  protected readonly depoimentos = rxResource({
    stream: () => this.avaliacaoService.recentes(3).pipe(catchError(() => of([]))),
  });

  protected readonly categorias = rxResource({
    stream: () => this.categoriaService.listar(),
  });

  protected readonly categoriasDosBlocos = computed(() => {
    const categorias = this.categorias.hasValue() ? this.categorias.value() : [];
    return [...categorias].sort((a, b) => posicaoDoBloco(a) - posicaoDoBloco(b));
  });

  protected readonly temOfertas = computed(
    () => this.ofertas.hasValue() && this.ofertas.value().itens.length > 0,
  );

  protected readonly maiorDesconto = computed(() =>
    this.ofertas.hasValue()
      ? Math.max(0, ...this.ofertas.value().itens.map((produto) => produto.percentualDesconto ?? 0))
      : 0,
  );

  protected readonly fotosQueFalharam = signal<ReadonlySet<string>>(new Set());
  protected readonly bannerFalhou = signal(false);

  protected readonly esqueletos = [1, 2, 3, 4];

  protected readonly vantagens: Vantagem[] = [
    { icone: 'verified', titulo: 'Produtos selecionados', texto: 'Qualidade testada' },
    { icone: 'sell', titulo: 'Preços competitivos', texto: 'O melhor custo-benefício' },
    { icone: 'headphones', titulo: 'Atendimento personalizado', texto: 'Fale com a gente' },
    { icone: 'local_shipping', titulo: 'Entrega rápida', texto: 'Belém e região' },
    { icone: 'credit_card', titulo: 'Pagamento facilitado', texto: '5% off no Pix' },
  ];

  protected iconeDaCategoria(slug: string): string {
    return ICONES_CATEGORIA[slug] ?? 'category';
  }

  protected fotoFalhou(slug: string): void {
    this.fotosQueFalharam.update((atuais) => new Set([...atuais, slug]));
  }

  protected estrelas(nota: number): number[] {
    return Array.from({ length: Math.round(nota) }, (_, indice) => indice);
  }
}

function posicaoDoBloco(categoria: Categoria): number {
  const posicao = ORDEM_DOS_BLOCOS.indexOf(categoria.slug);
  return posicao === -1 ? ORDEM_DOS_BLOCOS.length : posicao;
}
