import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CategoriaService } from '../../../core/services/categoria.service';
import { ProdutoService } from '../../../core/services/produto.service';
import { CardProduto } from '../../../shared/components/card-produto/card-produto';

interface Vantagem {
  icone: string;
  titulo: string;
  texto: string;
}

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

  protected readonly maisEmConta = rxResource({
    stream: () => this.produtoService.buscar({ ordenacao: 'MENOR_PRECO', tamanho: 4 }),
  });

  protected readonly games = rxResource({
    stream: () =>
      this.produtoService.buscar({
        categoria: 'games-e-controles',
        ordenacao: 'MAIS_RECENTES',
        tamanho: 4,
      }),
  });

  protected readonly categorias = rxResource({
    stream: () => this.categoriaService.listar(),
  });

  protected readonly esqueletos = [1, 2, 3, 4];

  protected readonly vantagens: Vantagem[] = [
    { icone: 'verified', titulo: 'Produtos selecionados', texto: 'Escolhidos pela loja' },
    { icone: 'sell', titulo: 'Preços competitivos', texto: 'O melhor custo-benefício' },
    { icone: 'support_agent', titulo: 'Atendimento personalizado', texto: 'Fale no WhatsApp' },
    { icone: 'local_shipping', titulo: 'Entrega rápida', texto: 'Belém e região' },
    { icone: 'qr_code_2', titulo: 'Pagamento facilitado', texto: 'Pix, cartão ou na entrega' },
  ];

  protected iconeDaCategoria(slug: string): string {
    return ICONES_CATEGORIA[slug] ?? 'category';
  }
}

const ICONES_CATEGORIA: Record<string, string> = {
  eletronicos: 'devices',
  'carregadores-e-cabos': 'cable',
  'games-e-controles': 'sports_esports',
  relogios: 'watch',
  barbeadores: 'content_cut',
  ferramentas: 'construction',
};
