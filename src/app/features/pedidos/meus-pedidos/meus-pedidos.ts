import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PedidoResumo, ROTULOS_STATUS_PEDIDO } from '../../../core/models/pedido';
import { PedidoService } from '../../../core/services/pedido.service';

const TAMANHO_PAGINA = 10;

@Component({
  selector: 'app-meus-pedidos',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './meus-pedidos.html',
  styleUrl: './meus-pedidos.scss',
})
export class MeusPedidos {
  private readonly pedidoService = inject(PedidoService);

  protected readonly paginaSolicitada = signal(0);
  protected readonly rotulosStatus = ROTULOS_STATUS_PEDIDO;

  protected readonly pedidos = rxResource({
    params: () => ({ pagina: this.paginaSolicitada(), tamanho: TAMANHO_PAGINA }),
    stream: ({ params }) => this.pedidoService.listar(params.pagina, params.tamanho),
  });

  protected readonly totalPedidos = computed(() =>
    this.pedidos.hasValue() ? this.pedidos.value().totalItens : 0,
  );

  protected readonly paginaAtualExibida = computed(() =>
    this.pedidos.hasValue() ? this.pedidos.value().pagina + 1 : 1,
  );

  protected readonly podeVoltar = computed(
    () =>
      this.pedidos.hasValue() &&
      !this.pedidos.isLoading() &&
      this.pedidos.value().pagina > 0,
  );

  protected readonly podeAvancar = computed(
    () =>
      this.pedidos.hasValue() &&
      !this.pedidos.isLoading() &&
      this.pedidos.value().pagina + 1 < this.pedidos.value().totalPaginas,
  );

  protected voltarPagina(): void {
    if (this.podeVoltar() && this.pedidos.hasValue()) {
      this.paginaSolicitada.set(this.pedidos.value().pagina - 1);
    }
  }

  protected avancarPagina(): void {
    if (this.podeAvancar() && this.pedidos.hasValue()) {
      this.paginaSolicitada.set(this.pedidos.value().pagina + 1);
    }
  }

  protected rastrearPedido(_indice: number, pedido: PedidoResumo): number {
    return pedido.id;
  }
}
