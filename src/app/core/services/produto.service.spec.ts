import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProdutoService } from './produto.service';

describe('ProdutoService', () => {
  let service: ProdutoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProdutoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('deve enviar só os filtros preenchidos', () => {
    service
      .buscar({ busca: 'controle', categoria: '', ordenacao: 'MENOR_PRECO', pagina: 0 })
      .subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/produtos');
    expect(requisicao.request.params.get('busca')).toBe('controle');
    expect(requisicao.request.params.get('ordenacao')).toBe('MENOR_PRECO');
    expect(requisicao.request.params.get('pagina')).toBe('0');
    expect(requisicao.request.params.has('categoria')).toBe(false);
    requisicao.flush({ itens: [], pagina: 0, tamanho: 12, totalItens: 0, totalPaginas: 0 });
  });

  it('deve buscar o detalhe pelo slug', () => {
    service.detalhar('game-stick').subscribe();

    http.expectOne('/api/produtos/game-stick').flush({});
  });

  it('deve buscar os destaques com limite', () => {
    service.destaques(4).subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/produtos/destaques');
    expect(requisicao.request.params.get('limite')).toBe('4');
    requisicao.flush([]);
  });
});
