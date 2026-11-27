import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { mensagemDeErro } from '../../../core/erro-api';
import { PedidoAdmin } from '../../../core/models/admin';
import {
  FormaPagamento,
  ROTULOS_FORMAS_PAGAMENTO,
  ROTULOS_STATUS_PEDIDO,
  StatusPedido,
} from '../../../core/models/pedido';
import { AdminPedidosService } from '../../../core/services/admin-pedidos.service';

function idPositivo(valor: string | null): number | null {
  if (!valor || !/^\d+$/.test(valor)) {
    return null;
  }
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

@Component({
  selector: 'app-detalhe-pedido-admin',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './detalhe-pedido-admin.html',
  styleUrl: './detalhe-pedido-admin.scss',
})
export class DetalhePedidoAdmin {
  private readonly rota = inject(ActivatedRoute);
  private readonly pedidosService = inject(AdminPedidosService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly id = toSignal(
    this.rota.paramMap.pipe(map((parametros) => idPositivo(parametros.get('id')))),
    { initialValue: idPositivo(this.rota.snapshot.paramMap.get('id')) },
  );

  protected readonly pedidoResource = rxResource({
    params: () => {
      const id = this.id();
      return id === null ? undefined : { id };
    },
    stream: ({ params }) => this.pedidosService.buscar(params.id),
  });

  protected readonly pedido = signal<PedidoAdmin | null>(null);
  protected readonly statusEmAtualizacao = signal<StatusPedido | null>(null);
  protected readonly recarregandoAposConflito = signal(false);
  protected readonly erroRecargaAposConflito = signal<string | null>(null);
  protected readonly feedback = signal<{ tipo: 'sucesso' | 'erro'; mensagem: string } | null>(null);
  protected readonly naoEncontrado = computed(() => {
    const erro = this.pedidoResource.error() as { cause?: unknown } | undefined;
    const causa = erro?.cause ?? erro;
    return causa instanceof HttpErrorResponse && causa.status === 404;
  });
  protected readonly erroCarregamento = computed(() =>
    mensagemDeErro(
      this.pedidoResource.error(),
      'Não foi possível carregar os dados do pedido. Tente novamente.',
    ),
  );
  protected readonly statusDisponiveis = computed(() => this.pedido()?.proximosStatus ?? []);
  protected readonly proximosStatusSemCancelamento = computed(() =>
    this.statusDisponiveis().filter((status) => status !== 'CANCELADO'),
  );
  protected readonly podeCancelar = computed(() => this.statusDisponiveis().includes('CANCELADO'));

  constructor() {
    effect(() => {
      if (this.pedidoResource.hasValue() && !this.pedidoResource.isLoading()) {
        this.pedido.set(this.pedidoResource.value());
      }
    });

  }

  protected tentarNovamente(): void {
    if (this.recarregandoAposConflito()) {
      this.recarregarAposConflito();
    } else {
      this.pedidoResource.reload();
    }
  }

  protected rotuloStatus(status: StatusPedido): string {
    return ROTULOS_STATUS_PEDIDO[status];
  }

  protected classeStatus(status: StatusPedido): string {
    return `status--${status.toLowerCase().replaceAll('_', '-')}`;
  }

  protected formaPagamento(forma: FormaPagamento): string {
    return ROTULOS_FORMAS_PAGAMENTO[forma];
  }

  protected atualizarStatus(status: StatusPedido): void {
    const pedido = this.pedido();
    const id = this.id();
    if (
      !pedido ||
      id === null ||
      this.statusEmAtualizacao() !== null ||
      !pedido.proximosStatus.includes(status)
    ) {
      return;
    }

    if (status === 'CANCELADO' && !globalThis.confirm(`Deseja cancelar o pedido ${pedido.codigo}?`)) {
      return;
    }

    this.feedback.set(null);
    this.statusEmAtualizacao.set(status);
    this.pedidosService
      .atualizarStatus(id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (atualizado) => {
          this.pedido.set(atualizado);
          this.statusEmAtualizacao.set(null);
          this.feedback.set({
            tipo: 'sucesso',
            mensagem:
              status === 'CANCELADO'
                ? 'O pedido foi cancelado.'
                : `Status atualizado para ${this.rotuloStatus(atualizado.status)}.`,
          });
        },
        error: (falha: unknown) => {
          this.statusEmAtualizacao.set(null);
          if (falha instanceof HttpErrorResponse && falha.status === 409) {
            this.feedback.set({
              tipo: 'erro',
              mensagem: 'O pedido mudou no servidor. Recarregando os dados atuais...',
            });
            this.recarregarAposConflito();
            return;
          }
          this.feedback.set({
            tipo: 'erro',
            mensagem: mensagemDeErro(falha, 'Não foi possível atualizar o status do pedido.'),
          });
        },
      });
  }

  private recarregarAposConflito(): void {
    const id = this.id();
    if (id === null) {
      this.erroRecargaAposConflito.set('O identificador do pedido não é válido.');
      return;
    }

    this.recarregandoAposConflito.set(true);
    this.erroRecargaAposConflito.set(null);
    this.pedidosService
      .buscar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (atualizado) => {
          this.pedido.set(atualizado);
          this.recarregandoAposConflito.set(false);
          this.erroRecargaAposConflito.set(null);
          this.feedback.set({
            tipo: 'erro',
            mensagem: 'O pedido mudou no servidor. Os dados atuais foram recarregados.',
          });
        },
        error: (falha: unknown) => {
          this.erroRecargaAposConflito.set(
            mensagemDeErro(falha, 'Não foi possível consultar o estado atual do pedido.'),
          );
        },
      });
  }
}
