import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { mensagemDeErro } from '../../core/erro-api';
import { Carrinho, ItemCarrinho } from '../../core/models/carrinho';
import { CarrinhoService } from '../../core/services/carrinho.service';

@Component({
  selector: 'app-carrinho-pagina',
  imports: [RouterLink, CurrencyPipe, MatIconModule],
  templateUrl: './carrinho-pagina.html',
  styleUrl: './carrinho-pagina.scss',
})
export class CarrinhoPagina implements OnInit {
  private readonly carrinhoService = inject(CarrinhoService);

  protected readonly carrinho = this.carrinhoService.carrinho;
  protected readonly processando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly itens = computed(() => this.carrinho()?.itens ?? []);

  ngOnInit(): void {
    this.carrinhoService.carregar();
  }

  protected alterarQuantidade(item: ItemCarrinho, delta: number): void {
    const quantidade = item.quantidade + delta;
    if (quantidade < 1) {
      return;
    }
    this.executar(this.carrinhoService.alterarQuantidade(item.produtoId, quantidade));
  }

  protected remover(item: ItemCarrinho): void {
    this.executar(this.carrinhoService.remover(item.produtoId));
  }

  protected esvaziar(): void {
    if (confirm('Remover todos os produtos do carrinho?')) {
      this.executar(this.carrinhoService.esvaziar());
    }
  }

  protected avisoDoItem(item: ItemCarrinho): string | null {
    if (item.disponivel) {
      return null;
    }
    return item.estoqueDisponivel > 0
      ? `Só temos ${item.estoqueDisponivel} em estoque. Diminua a quantidade.`
      : 'Produto indisponível no momento. Remova para continuar.';
  }

  private executar(requisicao: Observable<Carrinho>): void {
    this.processando.set(true);
    this.erro.set(null);
    requisicao.subscribe({
      next: () => this.processando.set(false),
      error: (falha: unknown) => {
        this.processando.set(false);
        this.erro.set(mensagemDeErro(falha, 'Não foi possível atualizar o carrinho.'));
      },
    });
  }
}
