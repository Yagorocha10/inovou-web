import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { App } from './app';
import { provideLocalePtBr } from './core/locale';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocalePtBr(),
      ],
    }).compileComponents();
  });

  it('deve criar a aplicação', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve exibir o header com as categorias da API e o footer', async () => {
    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne('/api/categorias').flush([{ id: 1, nome: 'Relógios', slug: 'relogios' }]);
    await fixture.whenStable();

    const pagina = fixture.nativeElement as HTMLElement;
    expect(pagina.querySelector('app-header .logo img')?.getAttribute('alt')).toBe('Inovou Store');
    expect(pagina.querySelector('.categorias')?.textContent).toContain('Relógios');
    expect(pagina.querySelector('app-footer')?.textContent).toContain('Inovou Store');
    http.verify();
  });

  it('oculta o header e o footer da loja ao navegar para /admin', async () => {
    localStorage.setItem(
      'inovou.sessao',
      JSON.stringify({
        token: 't',
        expiraEm: new Date(Date.now() + 60_000).toISOString(),
        usuario: { id: 1, nome: 'Admin', email: 'admin@x.com', role: 'ADMIN' },
      }),
    );

    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.match('/api/categorias').forEach((requisicao) => requisicao.flush([]));
    http.match('/api/carrinho').forEach((requisicao) =>
      requisicao.flush({ itens: [], quantidadeTotal: 0, subtotal: 0, podeFinalizar: false }),
    );

    await TestBed.inject(Router).navigateByUrl('/admin');
    fixture.detectChanges();
    http.expectOne('/api/admin/resumo').flush({
      pedidosHoje: 0,
      faturamentoHoje: 0,
      pedidosParaPreparar: 0,
      produtosSemEstoque: 0,
      ultimosPedidos: [],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const pagina = fixture.nativeElement as HTMLElement;
    expect(pagina.querySelector('app-header')).toBeNull();
    expect(pagina.querySelector('app-footer')).toBeNull();
    expect(pagina.querySelector('app-admin-layout')).not.toBeNull();
    http.verify();
  });
});
