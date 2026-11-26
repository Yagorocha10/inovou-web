import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PedidoService } from './pedido.service';

describe('PedidoService', () => {
  let service: PedidoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PedidoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('deve carregar o resumo do checkout com o endereço', () => {
    service.resumoCheckout(27).subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/checkout/resumo');
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.get('enderecoId')).toBe('27');
    requisicao.flush({});
  });

  it('deve criar um pedido com endereço e forma de pagamento', () => {
    const novoPedido = { enderecoId: 27, formaPagamento: 'PIX' as const };
    service.criar(novoPedido).subscribe();

    const requisicao = http.expectOne('/api/pedidos');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual(novoPedido);
    requisicao.flush({});
  });

  it('deve listar pedidos com a página informada e tamanho 10', () => {
    service.listar(2, 10).subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/pedidos');
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.get('pagina')).toBe('2');
    expect(requisicao.request.params.get('tamanho')).toBe('10');
    requisicao.flush({ itens: [], pagina: 2, tamanho: 10, totalItens: 0, totalPaginas: 0 });
  });

  it('usa tamanho 10 por padrão ao listar pedidos', () => {
    service.listar(0).subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/pedidos');
    expect(requisicao.request.params.get('pagina')).toBe('0');
    expect(requisicao.request.params.get('tamanho')).toBe('10');
    requisicao.flush({ itens: [], pagina: 0, tamanho: 10, totalItens: 0, totalPaginas: 0 });
  });

  it('deve buscar um pedido pelo ID', () => {
    service.buscar(54).subscribe();

    const requisicao = http.expectOne('/api/pedidos/54');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({});
  });

  it('deve cancelar um pedido com POST sem corpo', () => {
    service.cancelar(54).subscribe();

    const requisicao = http.expectOne('/api/pedidos/54/cancelar');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toBeNull();
    requisicao.flush({});
  });
});
