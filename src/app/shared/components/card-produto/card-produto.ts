import { CurrencyPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProdutoResumo } from '../../../core/models/catalogo';

@Component({
  selector: 'app-card-produto',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './card-produto.html',
  styleUrl: './card-produto.scss',
})
export class CardProduto {
  readonly produto = input.required<ProdutoResumo>();
}
