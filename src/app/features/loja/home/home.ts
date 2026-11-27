import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CategoriaService } from '../../../core/services/categoria.service';
import { ProdutoService } from '../../../core/services/produto.service';
import { CardProduto } from '../../../shared/components/card-produto/card-produto';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CardProduto, MatIconModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly produtoService = inject(ProdutoService);
  private readonly categoriaService = inject(CategoriaService);

  protected readonly destaques = rxResource({
    stream: () => this.produtoService.destaques(8),
  });

  protected readonly categorias = rxResource({
    stream: () => this.categoriaService.listar(),
  });

  protected readonly esqueletos = [1, 2, 3, 4];

  protected iconeDaCategoria(slug: string): string {
    return ICONES_CATEGORIA[slug] ?? 'category';
  }
}

const ICONES_CATEGORIA: Record<string, string> = {
  eletronicos: 'devices',
  'carregadores-e-cabos': 'cable',
  'games-e-controles': 'sports_esports',
  relogios: 'watch',
  barbeadores: 'face',
  ferramentas: 'construction',
};
