import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLocalePtBr } from '../../../core/locale';
import { Catalogo } from './catalogo';

describe('Catalogo', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Catalogo],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocalePtBr(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  it('deve buscar com os filtros da URL e listar os produtos', async () => {
    const fixture = TestBed.createComponent(Catalogo);
    fixture.componentRef.setInput('categoria', 'games-e-controles');
    fixture.componentRef.setInput('ordenacao', 'MENOR_PRECO');
    fixture.componentRef.setInput('pagina', '1');
    fixture.detectChanges();
    TestBed.tick();

    http
      .expectOne('/api/categorias')
      .flush([{ id: 3, nome: 'Games e controles', slug: 'games-e-controles' }]);
    const requisicao = http.expectOne((r) => r.url === '/api/produtos');
    expect(requisicao.request.params.get('categoria')).toBe('games-e-controles');
    expect(requisicao.request.params.get('ordenacao')).toBe('MENOR_PRECO');
    expect(requisicao.request.params.get('pagina')).toBe('1');
    expect(requisicao.request.params.has('busca')).toBe(false);
    requisicao.flush({
      itens: [
        {
          id: 1,
          nome: 'Game Stick',
          slug: 'game-stick',
          preco: 50,
          imagemPrincipal: null,
          categoria: { id: 3, nome: 'Games e controles', slug: 'games-e-controles' },
          disponivel: false,
        },
      ],
      pagina: 1,
      tamanho: 12,
      totalItens: 13,
      totalPaginas: 2,
    });
    await fixture.whenStable();

    const pagina = fixture.nativeElement as HTMLElement;
    expect(pagina.querySelector('h1')?.textContent).toContain('Games e controles');
    expect(pagina.querySelectorAll('app-card-produto').length).toBe(1);
    expect(pagina.querySelector('.cabecalho__total')?.textContent).toContain(
      '13 produtos encontrados',
    );
    expect(pagina.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('2');
    expect((pagina.querySelector('.ordenar select') as HTMLSelectElement).value).toBe(
      'MENOR_PRECO',
    );
    http.verify();
  });

  it('deve mostrar mensagem quando nada for encontrado', async () => {
    const fixture = TestBed.createComponent(Catalogo);
    fixture.componentRef.setInput('busca', 'xyz');
    fixture.detectChanges();
    TestBed.tick();

    http.expectOne('/api/categorias').flush([]);
    http
      .expectOne((r) => r.url === '/api/produtos')
      .flush({ itens: [], pagina: 0, tamanho: 12, totalItens: 0, totalPaginas: 0 });
    await fixture.whenStable();

    const pagina = fixture.nativeElement as HTMLElement;
    expect(pagina.querySelector('h1')?.textContent).toContain('xyz');
    expect(pagina.querySelector('.estado')?.textContent).toContain('Nenhum produto encontrado');
  });
  it('deve mostrar o erro sem quebrar quando a API estiver fora do ar', async () => {
    const fixture = TestBed.createComponent(Catalogo);
    fixture.componentRef.setInput('categoria', 'games-e-controles');
    fixture.detectChanges();
    TestBed.tick();

    http.expectOne('/api/categorias').flush('erro', { status: 502, statusText: 'Bad Gateway' });
    http
      .expectOne((r) => r.url === '/api/produtos')
      .flush('erro', { status: 502, statusText: 'Bad Gateway' });
    await fixture.whenStable();

    const pagina = fixture.nativeElement as HTMLElement;
    expect(pagina.querySelector('h1')?.textContent).toContain('Todos os produtos');
    expect(pagina.querySelector('.estado')?.textContent).toContain(
      'Não foi possível carregar os produtos',
    );
    expect(pagina.querySelectorAll('.filtros__link').length).toBe(1);
  });

  it('filtra só as ofertas quando a URL pede', async () => {
    const fixture = TestBed.createComponent(Catalogo);
    fixture.componentRef.setInput('ofertas', 'true');
    fixture.detectChanges();
    TestBed.tick();

    http.expectOne('/api/categorias').flush([]);
    const requisicao = http.expectOne((r) => r.url === '/api/produtos');
    expect(requisicao.request.params.get('ofertas')).toBe('true');
    requisicao.flush({ itens: [], pagina: 0, tamanho: 12, totalItens: 0, totalPaginas: 0 });
    await fixture.whenStable();

    const pagina = fixture.nativeElement as HTMLElement;
    expect(pagina.querySelector('h1')?.textContent).toContain('Ofertas');
    expect(pagina.querySelector('.chips')?.textContent).toContain('Ofertas');
    http.verify();
  });
});
