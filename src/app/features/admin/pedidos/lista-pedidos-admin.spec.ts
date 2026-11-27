import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLocalePtBr } from '../../../core/locale';
import { PedidoAdminResumo } from '../../../core/models/admin';
import { ListaPedidosAdmin } from './lista-pedidos-admin';

@Component({ template: '<p>Detalhe do pedido</p>' })
class DetalhePedidoAdminTeste {}

const pedido: PedidoAdminResumo = {
  id: 37,
  codigo: 'PED-2025-0037',
  status: 'PAGO',
  criadoEm: '2025-03-15T10:30:00.000Z',
  cliente: { id: 9, nome: 'Ana Souza', email: 'ana@example.com' },
  formaPagamento: 'PIX',
  quantidadeItens: 2,
  total: 149.9,
};

function pagina(
  itens: PedidoAdminResumo[],
  atual = 0,
  totalPaginas = itens.length ? 1 : 0,
  totalItens = itens.length,
) {
  return { itens, pagina: atual, tamanho: 20, totalItens, totalPaginas };
}

describe('ListaPedidosAdmin', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaPedidosAdmin, DetalhePedidoAdminTeste],
      providers: [
        provideRouter([
          { path: 'admin/pedidos', component: ListaPedidosAdmin },
          { path: 'admin/pedidos/:id', component: DetalhePedidoAdminTeste },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocalePtBr(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  async function abrir(url = '/admin/pedidos'): Promise<RouterTestingHarness> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, ListaPedidosAdmin);
    return harness;
  }

  function requisicaoPedidos(validar?: (params: URLSearchParams) => boolean) {
    return http.expectOne((requisicao) => {
      if (requisicao.url !== '/api/admin/pedidos') {
        return false;
      }
      const params = new URLSearchParams(requisicao.params.toString());
      return validar ? validar(params) : true;
    });
  }

  async function aguardarUrl(contem: string): Promise<void> {
    await vi.waitFor(() => expect(router.url).toContain(contem));
  }

  it('carrega e apresenta pedido, cliente, data, pagamento, total e status', async () => {
    const paginaTeste = await abrir();
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Carregando pedidos');

    const requisicao = requisicaoPedidos((params) =>
      params.get('pagina') === '0' && params.get('tamanho') === '20' &&
      !params.has('status') && !params.has('busca'),
    );
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(pagina([pedido]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    const elemento = paginaTeste.routeNativeElement as HTMLElement;
    expect(elemento.querySelector('tbody tr')).not.toBeNull();
    expect(elemento.textContent).toContain('PED-2025-0037');
    expect(elemento.textContent).toContain('Ana Souza');
    expect(elemento.textContent).toContain('ana@example.com');
    expect(elemento.textContent).toContain('15/03/2025');
    expect(elemento.textContent).toContain('Pix');
    expect(elemento.textContent).toContain('2');
    expect(elemento.textContent).toContain('R$ 149,90');
    expect(elemento.textContent).toContain('Pago');
    expect(elemento.querySelector('a[href="/admin/pedidos/37"]')?.textContent).toContain('Ver detalhes');
  });

  it('busca por texto com debounce e envia somente o termo preenchido', async () => {
    const paginaTeste = await abrir();
    requisicaoPedidos().flush(pagina([pedido]));
    await paginaTeste.fixture.whenStable();

    const input = paginaTeste.routeNativeElement?.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = ' Ana Souza ';
    input.dispatchEvent(new Event('input'));
    await new Promise((resolver) => setTimeout(resolver, 350));
    await aguardarUrl('busca=Ana');

    const requisicao = requisicaoPedidos((params) => params.get('busca') === 'Ana Souza');
    expect(requisicao.request.params.get('pagina')).toBe('0');
    expect(requisicao.request.params.get('tamanho')).toBe('20');
    requisicao.flush(pagina([pedido]));
    await paginaTeste.fixture.whenStable();
    expect(router.parseUrl(router.url).queryParams['busca']).toBe('Ana Souza');
  });

  it('filtra por status e redefine a página para zero', async () => {
    const paginaTeste = await abrir('/admin/pedidos?pagina=3');
    requisicaoPedidos((params) => params.get('pagina') === '3').flush(pagina([pedido], 3, 4, 61));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    const select = paginaTeste.routeNativeElement?.querySelector('select') as HTMLSelectElement;
    select.value = 'EM_SEPARACAO';
    select.dispatchEvent(new Event('change'));
    await aguardarUrl('status=EM_SEPARACAO');
    const requisicao = requisicaoPedidos(
      (params) => params.get('status') === 'EM_SEPARACAO' && params.get('pagina') === '0',
    );
    requisicao.flush(pagina([pedido]));
    expect(router.parseUrl(router.url).queryParams['pagina']).toBeUndefined();
  });

  it('preserva busca e status ao paginar e restaura os filtros após voltar na URL', async () => {
    const paginaTeste = await abrir('/admin/pedidos?busca=ana&status=PAGO');
    requisicaoPedidos((params) => params.get('busca') === 'ana' && params.get('status') === 'PAGO')
      .flush(pagina([pedido], 0, 3, 45));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    (paginaTeste.routeNativeElement?.querySelector('.paginacao button:last-child') as HTMLButtonElement).click();
    await aguardarUrl('pagina=1');
    requisicaoPedidos((params) =>
      params.get('busca') === 'ana' && params.get('status') === 'PAGO' && params.get('pagina') === '1',
    ).flush(pagina([pedido], 1, 3, 45));
    await paginaTeste.fixture.whenStable();

    await router.navigateByUrl('/admin/pedidos?busca=ana&status=PAGO');
    await aguardarUrl('status=PAGO');
    paginaTeste.detectChanges();
    requisicaoPedidos((params) =>
      params.get('busca') === 'ana' && params.get('status') === 'PAGO' && params.get('pagina') === '0',
    ).flush(pagina([pedido], 0, 3, 45));
    await paginaTeste.fixture.whenStable();
    expect((paginaTeste.routeNativeElement?.querySelector('input[type="search"]') as HTMLInputElement).value).toBe('ana');
    expect((paginaTeste.routeNativeElement?.querySelector('select') as HTMLSelectElement).value).toBe('PAGO');
  });

  it('cancela busca pendente ao navegar pelos parâmetros da rota', async () => {
    const paginaTeste = await abrir('/admin/pedidos?busca=anterior');
    requisicaoPedidos((params) => params.get('busca') === 'anterior').flush(pagina([pedido]));
    await paginaTeste.fixture.whenStable();

    const input = paginaTeste.routeNativeElement?.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'termo pendente';
    input.dispatchEvent(new Event('input'));
    await router.navigateByUrl('/admin/pedidos?busca=restaurado&status=PAGO');
    await aguardarUrl('busca=restaurado');
    paginaTeste.detectChanges();
    requisicaoPedidos((params) => params.get('busca') === 'restaurado' && params.get('status') === 'PAGO')
      .flush(pagina([pedido]));
    await paginaTeste.fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver, 350));

    expect((paginaTeste.routeNativeElement?.querySelector('input[type="search"]') as HTMLInputElement).value).toBe('restaurado');
    http.expectNone((req) => req.url === '/api/admin/pedidos' && req.params.get('busca') === 'termo pendente');
  });

  it('remove parâmetros inválidos e vazios preservando query parameters alheios', async () => {
    const paginaTeste = await abrir('/admin/pedidos?busca=%20%20&status=DESCONHECIDO&pagina=-1&preservado=sim');
    await vi.waitFor(() => expect(router.url).toBe('/admin/pedidos?preservado=sim'));
    const requisicao = requisicaoPedidos((params) =>
      !params.has('busca') && !params.has('status') && params.get('pagina') === '0',
    );
    requisicao.flush(pagina([]));
    await paginaTeste.fixture.whenStable();
    expect(router.parseUrl(router.url).queryParams).toEqual({ preservado: 'sim' });
  });

  it('corrige página além do intervalo sem confundir com catálogo vazio', async () => {
    const paginaTeste = await abrir('/admin/pedidos?busca=ana&status=PAGO&pagina=8');
    requisicaoPedidos((params) => params.get('pagina') === '8').flush(pagina([], 8, 2, 35));
    await aguardarUrl('pagina=1');
    requisicaoPedidos((params) =>
      params.get('busca') === 'ana' && params.get('status') === 'PAGO' && params.get('pagina') === '1',
    ).flush(pagina([pedido], 1, 2, 35));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Página 2 de 2');
    expect(paginaTeste.routeNativeElement?.textContent).not.toContain('Nenhum pedido cadastrado.');
  });

  it('mostra catálogo vazio e ausência de resultados filtrados em estados distintos', async () => {
    const paginaTeste = await abrir();
    requisicaoPedidos().flush(pagina([]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Nenhum pedido cadastrado.');

    await router.navigateByUrl('/admin/pedidos?status=CANCELADO');
    paginaTeste.detectChanges();
    requisicaoPedidos((params) => params.get('status') === 'CANCELADO').flush(pagina([]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Nenhum pedido encontrado para os filtros atuais.');
    expect(paginaTeste.routeNativeElement?.textContent).not.toContain('Nenhum pedido cadastrado.');
  });

  it('distingue uma página sem resultados de uma lista vazia', async () => {
    const paginaTeste = await abrir('/admin/pedidos?pagina=1');
    requisicaoPedidos((params) => params.get('pagina') === '1').flush(pagina([], 1, 2, 25));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Esta página não contém pedidos.');
    expect(paginaTeste.routeNativeElement?.textContent).not.toContain('Nenhum pedido cadastrado.');
  });

  it('apresenta mensagem específica da API e permite tentar novamente', async () => {
    const paginaTeste = await abrir();
    requisicaoPedidos().flush(
      { mensagem: 'A API de pedidos está temporariamente indisponível.' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();
    expect(paginaTeste.routeNativeElement?.textContent).toContain('A API de pedidos está temporariamente indisponível.');

    (paginaTeste.routeNativeElement?.querySelector('button') as HTMLButtonElement).click();
    paginaTeste.detectChanges();
    requisicaoPedidos().flush(pagina([pedido]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();
    expect(paginaTeste.routeNativeElement?.textContent).toContain('PED-2025-0037');
  });

  it('navega para a rota de detalhes pelo link do pedido', async () => {
    const paginaTeste = await abrir();
    requisicaoPedidos().flush(pagina([pedido]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    (paginaTeste.routeNativeElement?.querySelector('a[href="/admin/pedidos/37"]') as HTMLAnchorElement).click();
    await vi.waitFor(() => expect(router.url).toBe('/admin/pedidos/37'));
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Detalhe do pedido');
  });
});
