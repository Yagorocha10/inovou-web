import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { mensagemDeErro } from '../../../core/erro-api';
import { ProdutoResumo } from '../../../core/models/catalogo';
import { AuthService } from '../../../core/services/auth.service';
import { CarrinhoService } from '../../../core/services/carrinho.service';
import { FavoritosService } from '../../../core/services/favoritos.service';

@Component({
  selector: 'app-card-produto',
  imports: [RouterLink, CurrencyPipe, DecimalPipe, MatIconModule],
  templateUrl: './card-produto.html',
  styleUrl: './card-produto.scss',
})
export class CardProduto {
  private readonly auth = inject(AuthService);
  private readonly carrinho = inject(CarrinhoService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly favoritos = inject(FavoritosService);

  readonly produto = input.required<ProdutoResumo>();

  protected readonly favorito = computed(() => this.favoritos.ehFavorito(this.produto().slug));
  protected readonly desconto = computed(() =>
    this.produto().precoAnterior ? (this.produto().percentualDesconto ?? 0) : 0,
  );

  protected readonly adicionando = signal(false);

  protected adicionar(): void {
    const produto = this.produto();
    if (!this.auth.logado()) {
      this.router.navigate(['/entrar'], { queryParams: { retorno: `/produtos/${produto.slug}` } });
      return;
    }
    this.adicionando.set(true);
    this.carrinho.adicionar(produto.id, 1).subscribe({
      next: () => {
        this.adicionando.set(false);
        this.snackBar
          .open('Produto adicionado ao carrinho', 'Ver carrinho', { duration: 4000 })
          .onAction()
          .subscribe(() => this.router.navigate(['/carrinho']));
      },
      error: (falha: unknown) => {
        this.adicionando.set(false);
        this.snackBar.open(mensagemDeErro(falha, 'Não foi possível adicionar ao carrinho.'), 'OK', {
          duration: 5000,
        });
      },
    });
  }
}
