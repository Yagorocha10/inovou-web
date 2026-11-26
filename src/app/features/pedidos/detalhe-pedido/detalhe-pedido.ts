import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { throwError } from 'rxjs';
import { mensagemDeErro } from '../../../core/erro-api';
import {
  FormaPagamento,
  Pedido,
  ROTULOS_FORMAS_PAGAMENTO,
  ROTULOS_STATUS_PEDIDO,
} from '../../../core/models/pedido';
import { PedidoService } from '../../../core/services/pedido.service';

@Component({
  selector: 'app-detalhe-pedido',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './detalhe-pedido.html',
  styleUrl: './detalhe-pedido.scss',
})
export class DetalhePedido {
  private readonly pedidoService = inject(PedidoService);
  private readonly destroyRef = inject(DestroyRef);

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

  protected readonly cancelando = signal(false);
  protected readonly cancelamentoConcluido = signal(false);
  protected readonly erroCancelamento = signal<string | null>(null);
  protected readonly rotulosPagamento = ROTULOS_FORMAS_PAGAMENTO;
  protected readonly rotulosStatus = ROTULOS_STATUS_PEDIDO;

  protected readonly naoEncontrado = computed(() => {
    const erro = this.pedido.error() as { cause?: unknown } | undefined;
    const causa = erro?.cause ?? erro;
    return causa instanceof HttpErrorResponse && causa.status === 404;
  });

  protected readonly mensagemErroCarregamento = computed(() =>
    this.naoEncontrado()
      ? 'Não foi possível localizar este pedido.'
      : 'Não foi possível carregar os dados do pedido. Tente novamente.',
  );

  protected formaPagamento(forma: FormaPagamento): string {
    return this.rotulosPagamento[forma];
  }

  protected cancelarPedido(atual: Pedido): void {
    if (this.cancelando() || this.cancelamentoConcluido() || !atual.podeCancelar) {
      return;
    }

    const id = Number(this.id());
    if (!Number.isSafeInteger(id) || id <= 0) {
      return;
    }

    if (!globalThis.confirm(`Deseja cancelar o pedido ${atual.codigo}?`)) {
      return;
    }

    this.cancelando.set(true);
    this.erroCancelamento.set(null);
    this.pedidoService
      .cancelar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelando.set(false);
          this.cancelamentoConcluido.set(true);
          this.pedido.reload();
        },
        error: (falha: unknown) => {
          this.cancelando.set(false);
          const padrao =
            falha instanceof HttpErrorResponse && falha.status === 409
              ? 'Não foi possível cancelar o pedido. Verifique o status atual e tente novamente.'
              : 'Não foi possível cancelar o pedido. Seus dados permanecem disponíveis.';
          this.erroCancelamento.set(mensagemDeErro(falha, padrao));
        },
      });
  }
}
