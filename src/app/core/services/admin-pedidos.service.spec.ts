import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminPedidosService } from './admin-pedidos.service';

describe('AdminPedidosService', () => {
  let service: AdminPedidosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminPedidosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista pedidos com filtros, omitindo strings vazias e preservando zero', () => {
    service.listar({ status: 'PAGO', busca: ' ', pagina: 0, tamanho: 20 }).subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/admin/pedidos');
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.get('status')).toBe('PAGO');
    expect(requisicao.request.params.has('busca')).toBe(false);
    expect(requisicao.request.params.get('pagina')).toBe('0');
    expect(requisicao.request.params.get('tamanho')).toBe('20');
    requisicao.flush({ itens: [], pagina: 0, tamanho: 20, totalItens: 0, totalPaginas: 0 });
  });

  it('busca o pedido pelo ID', () => {
    service.buscar(24).subscribe();

    const requisicao = http.expectOne('/api/admin/pedidos/24');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({});
  });

  it('atualiza status com PATCH e corpo tipado por StatusPedido', () => {
    service.atualizarStatus(24, 'EM_SEPARACAO').subscribe();

    const requisicao = http.expectOne('/api/admin/pedidos/24/status');
    expect(requisicao.request.method).toBe('PATCH');
    expect(requisicao.request.body).toEqual({ status: 'EM_SEPARACAO' });
    requisicao.flush({});
  });
});
