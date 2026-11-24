import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controle: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'inovou.sessao',
      JSON.stringify({
        token: 'abc',
        expiraEm: new Date(Date.now() + 60_000).toISOString(),
        usuario: { id: 1, nome: 'Yago', email: 'y@x.com', role: 'CLIENTE' },
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    controle = TestBed.inject(HttpTestingController);
  });

  it('deve enviar o token nas chamadas da API', () => {
    http.get('/api/me').subscribe();

    expect(controle.expectOne('/api/me').request.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('não deve enviar o token para outros sites', () => {
    http.get('https://viacep.com.br/ws/66035170/json/').subscribe();

    expect(
      controle
        .expectOne('https://viacep.com.br/ws/66035170/json/')
        .request.headers.has('Authorization'),
    ).toBe(false);
  });

  it('deve encerrar a sessão quando a API responder 401', () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    http.get('/api/me').subscribe({ error: () => undefined });
    controle.expectOne('/api/me').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(TestBed.inject(AuthService).logado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/entrar'], expect.anything());
  });
});
