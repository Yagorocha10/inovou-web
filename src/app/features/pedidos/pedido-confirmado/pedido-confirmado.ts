import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { throwError } from 'rxjs';
import { FormaPagamento, ROTULOS_FORMAS_PAGAMENTO, ROTULOS_STATUS_PEDIDO } from '../../../core/models/pedido';
import { PedidoService } from '../../../core/services/pedido.service';
import { PagamentoPix } from '../../../shared/components/pagamento-pix/pagamento-pix';

@Component({
  selector: 'app-pedido-confirmado',
  imports: [CurrencyPipe, DatePipe, RouterLink, PagamentoPix],
  templateUrl: './pedido-confirmado.html',
  styleUrl: './pedido-confirmado.scss',
})
export class PedidoConfirmado {
  private readonly pedidoService = inject(PedidoService);

  readonly id = input.required<string>();

  protected readonly pedido = rxResource({
    params: () => this.id(),
    stream: ({ params }) => {
      const id = Number(params);
      if (!Number.isSafeInteger(id) || id <= 0) {
        return throwError(() => new Error('ID inválido'));
      }
      return this.pedidoService.buscar(id);
    },
  });

  protected readonly rotulosPagamento = ROTULOS_FORMAS_PAGAMENTO;
  protected readonly rotulosStatus = ROTULOS_STATUS_PEDIDO;

  protected readonly naoEncontrado = computed(() => {
    const erro = this.pedido.error() as { cause?: unknown } | undefined;
    const causa = erro?.cause ?? erro;
    return causa instanceof HttpErrorResponse && causa.status === 404;
  });

  protected readonly mensagemErro = computed(() =>
    this.naoEncontrado()
      ? 'Não foi possível localizar este pedido.'
      : 'Não foi possível carregar os dados do pedido. Tente novamente.',
  );

  protected formaPagamento(forma: FormaPagamento): string {
    return this.rotulosPagamento[forma];
  }
}
