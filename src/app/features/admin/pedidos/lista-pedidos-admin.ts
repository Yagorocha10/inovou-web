import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, map, skip, switchMap, takeUntil, timer } from 'rxjs';
import { mensagemDeErro } from '../../../core/erro-api';
import { FiltroPedidosAdmin } from '../../../core/models/admin';
import {
  FormaPagamento,
  ROTULOS_FORMAS_PAGAMENTO,
  ROTULOS_STATUS_PEDIDO,
  StatusPedido,
} from '../../../core/models/pedido';
import { AdminPedidosService } from '../../../core/services/admin-pedidos.service';

const TAMANHO_PAGINA = 20;
const STATUS_PEDIDOS = Object.keys(ROTULOS_STATUS_PEDIDO) as StatusPedido[];
const STATUS_VALIDOS = new Set<string>(STATUS_PEDIDOS);

function numeroInteiro(valor: string | null): number {
  if (valor === null || !/^\d+$/.test(valor)) {
    return 0;
  }
  const numero = Number(valor);
  return Number.isSafeInteger(numero) ? numero : 0;
}

@Component({
  selector: 'app-lista-pedidos-admin',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './lista-pedidos-admin.html',
  styleUrl: './lista-pedidos-admin.scss',
})
export class ListaPedidosAdmin {
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pedidosService = inject(AdminPedidosService);

  protected readonly busca = new FormControl('', { nonNullable: true });
  protected readonly statusControl = new FormControl('', { nonNullable: true });
  protected readonly statusDisponiveis = STATUS_PEDIDOS;
  private readonly parametros = toSignal(this.rota.queryParamMap, {
    initialValue: this.rota.snapshot.queryParamMap,
  });

  protected readonly buscaAtual = computed(() => this.parametros().get('busca')?.trim() ?? '');
  protected readonly status = computed(() => {
    const valor = this.parametros().get('status');
    return valor !== null && STATUS_VALIDOS.has(valor) ? (valor as StatusPedido) : undefined;
  });
  protected readonly pagina = computed(() => numeroInteiro(this.parametros().get('pagina')));

  protected readonly filtro = computed<FiltroPedidosAdmin>(() => ({
    busca: this.buscaAtual() || undefined,
    status: this.status(),
    pagina: this.pagina(),
    tamanho: TAMANHO_PAGINA,
  }));

  protected readonly pedidos = rxResource({
    params: () => this.filtro(),
    stream: ({ params }) => this.pedidosService.listar(params),
  });

  protected readonly erroCarregamento = computed(() =>
    mensagemDeErro(
      this.pedidos.error(),
      'Não foi possível carregar os pedidos. Confira sua conexão e tente novamente.',
    ),
  );

  protected readonly itens = computed(() =>
    this.pedidos.hasValue() ? this.pedidos.value().itens : [],
  );
  protected readonly filtrosAtivos = computed(() => !!this.buscaAtual() || this.status() !== undefined);
  protected readonly paginaForaDoIntervalo = computed(() => {
    if (!this.pedidos.hasValue()) {
      return false;
    }
    const totalPaginas = this.pedidos.value().totalPaginas;
    return totalPaginas === 0 ? this.pagina() > 0 : this.pagina() >= totalPaginas;
  });

  constructor() {
    effect(() => {
      const buscaNaUrl = this.buscaAtual();
      if (this.busca.value !== buscaNaUrl) {
        this.busca.setValue(buscaNaUrl, { emitEvent: false });
      }
      const statusNaUrl = this.status() ?? '';
      if (this.statusControl.value !== statusNaUrl) {
        this.statusControl.setValue(statusNaUrl, { emitEvent: false });
      }
    });

    effect(() => this.normalizarParametrosDaUrl());

    effect(() => {
      if (this.pedidos.isLoading() || this.pedidos.error() || !this.pedidos.hasValue()) {
        return;
      }
      const totalPaginas = this.pedidos.value().totalPaginas;
      const solicitada = this.pagina();
      const ultimaValida = Math.max(totalPaginas - 1, 0);
      const paginaValida = Math.min(solicitada, ultimaValida);
      if (paginaValida !== solicitada) {
        this.normalizarQuery({ pagina: paginaValida === 0 ? null : String(paginaValida) });
      }
    });

    this.busca.valueChanges
      .pipe(
        switchMap((valor) =>
          timer(300).pipe(
            takeUntil(this.rota.queryParamMap.pipe(skip(1))),
            map(() => valor.trim()),
          ),
        ),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((valor) => this.navegar({ busca: valor || null, pagina: null }));
  }

  protected alterarStatus(valor: string): void {
    this.navegar({
      status: STATUS_VALIDOS.has(valor) ? valor : null,
      pagina: null,
    });
  }

  protected irParaPagina(pagina: number): void {
    this.navegar({ pagina: pagina === 0 ? null : pagina });
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

  protected tentarNovamente(): void {
    this.pedidos.reload();
  }

  private normalizarParametrosDaUrl(): void {
    const parametros = this.parametros();
    const correcoes: Record<string, string | null> = {};

    const busca = parametros.get('busca');
    if (busca !== null) {
      const normalizada = busca.trim() || null;
      if (normalizada !== busca) {
        correcoes['busca'] = normalizada;
      }
    }

    const status = parametros.get('status');
    if (status !== null && !STATUS_VALIDOS.has(status)) {
      correcoes['status'] = null;
    }

    const pagina = parametros.get('pagina');
    if (pagina !== null) {
      const numero = /^\d+$/.test(pagina) ? Number(pagina) : -1;
      const normalizada = Number.isSafeInteger(numero) && numero > 0 ? String(numero) : null;
      if (normalizada !== pagina) {
        correcoes['pagina'] = normalizada;
      }
    }

    if (Object.keys(correcoes).length) {
      this.normalizarQuery(correcoes);
    }
  }

  private normalizarQuery(queryParams: Record<string, string | null>): void {
    const atuais = this.parametros();
    if (Object.entries(queryParams).every(([chave, valor]) => atuais.get(chave) === valor)) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.rota,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private navegar(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], {
      relativeTo: this.rota,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
