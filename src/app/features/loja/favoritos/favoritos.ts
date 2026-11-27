import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { ProdutoDetalhe, ProdutoResumo } from '../../../core/models/catalogo';
import { FavoritosService } from '../../../core/services/favoritos.service';
import { ProdutoService } from '../../../core/services/produto.service';
import { CardProduto } from '../../../shared/components/card-produto/card-produto';

@Component({
  selector: 'app-favoritos',
  imports: [RouterLink, CardProduto],
  templateUrl: './favoritos.html',
  styleUrl: './favoritos.scss',
})
export class Favoritos {
  private readonly produtoService = inject(ProdutoService);
  protected readonly favoritos = inject(FavoritosService);

  protected readonly produtos = rxResource({
    params: () => this.favoritos.lista(),
    stream: ({ params: slugs }) => this.carregar(slugs),
  });

  private carregar(slugs: string[]): Observable<ProdutoResumo[]> {
    if (slugs.length === 0) {
      return of([]);
    }
    return forkJoin(
      slugs.map((slug) =>
        this.produtoService.detalhar(slug).pipe(
          map((produto) => paraResumo(produto)),
          catchError(() => of(null)),
        ),
      ),
    ).pipe(
      map((produtos) => produtos.filter((produto): produto is ProdutoResumo => produto !== null)),
    );
  }
}

function paraResumo(produto: ProdutoDetalhe): ProdutoResumo {
  return {
    id: produto.id,
    nome: produto.nome,
    slug: produto.slug,
    preco: produto.preco,
    precoAnterior: produto.precoAnterior ?? null,
    percentualDesconto: produto.percentualDesconto ?? 0,
    precoPix: produto.precoPix,
    imagemPrincipal: produto.imagens[0] ?? null,
    categoria: produto.categoria,
    disponivel: produto.disponivel,
    notaMedia: produto.notaMedia ?? null,
    totalAvaliacoes: produto.totalAvaliacoes ?? 0,
  };
}
