import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { provideLocalePtBr } from './core/locale';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
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
    expect(pagina.querySelector('app-header .logo__inovou')?.textContent).toContain('INOVOU');
    expect(pagina.querySelector('.categorias')?.textContent).toContain('Relógios');
    expect(pagina.querySelector('app-footer')?.textContent).toContain('Inovou Store');
    http.verify();
  });
});
