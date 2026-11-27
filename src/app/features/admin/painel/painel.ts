import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { mensagemDeErro } from '../../../core/erro-api';
import { ROTULOS_STATUS_PEDIDO, StatusPedido } from '../../../core/models/pedido';
import { AdminResumoService } from '../../../core/services/admin-resumo.service';

@Component({
  selector: 'app-painel',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './painel.html',
  styleUrl: './painel.scss',
})
export class Painel {
  private readonly resumoService = inject(AdminResumoService);

  protected readonly resumo = rxResource({
    stream: () => this.resumoService.buscar(),
  });

  protected readonly erroCarregamento = computed(() =>
    mensagemDeErro(
      this.resumo.error(),
      'Não foi possível carregar o painel. Confira sua conexão e tente novamente.',
    ),
  );

  protected tentarNovamente(): void {
    this.resumo.reload();
  }

  protected rotuloStatus(status: StatusPedido): string {
    return ROTULOS_STATUS_PEDIDO[status];
  }

  protected classeStatus(status: StatusPedido): string {
    return `status--${status.toLowerCase().replaceAll('_', '-')}`;
  }
}
