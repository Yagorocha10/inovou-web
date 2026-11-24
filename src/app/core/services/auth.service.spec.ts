import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Sessao } from '../models/auth';
import { AuthService } from './auth.service';

const futuro = new Date(Date.now() + 60 * 60 * 1000).toISOString();

const sessao: Sessao = {
  token: 'jwt-de-teste',
  expiraEm: futuro,
  usuario: { id: 1, nome: 'Yago da Silva', email: 'yago@exemplo.com', role: 'CLIENTE' },
};

describe('AuthService', () => {
  let http: HttpTestingController;

  function criar(): AuthService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => localStorage.clear());

  it('deve guardar a sessão depois do login', () => {
    const auth = criar();

    auth.login('yago@exemplo.com', 'senhaForte1').subscribe();
    const requisicao = http.expectOne('/api/auth/login');
    expect(requisicao.request.body).toEqual({ email: 'yago@exemplo.com', senha: 'senhaForte1' });
    requisicao.flush(sessao);

    expect(auth.logado()).toBe(true);
    expect(auth.primeiroNome()).toBe('Yago');
    expect(auth.token()).toBe('jwt-de-teste');
    expect(localStorage.getItem('inovou.sessao')).toContain('jwt-de-teste');
  });

  it('deve restaurar a sessão salva e descartar a expirada', () => {
    localStorage.setItem('inovou.sessao', JSON.stringify(sessao));
    expect(criar().logado()).toBe(true);

    TestBed.resetTestingModule();
    localStorage.setItem(
      'inovou.sessao',
      JSON.stringify({ ...sessao, expiraEm: new Date(Date.now() - 1000).toISOString() }),
    );
    const auth = criar();
    expect(auth.logado()).toBe(false);
    expect(localStorage.getItem('inovou.sessao')).toBeNull();
  });

  it('deve limpar tudo ao sair', () => {
    localStorage.setItem(
      'inovou.sessao',
      JSON.stringify({ ...sessao, usuario: { ...sessao.usuario, role: 'ADMIN' } }),
    );
    const auth = criar();
    expect(auth.ehAdmin()).toBe(true);

    auth.sair();

    expect(auth.logado()).toBe(false);
    expect(auth.token()).toBeNull();
    expect(localStorage.getItem('inovou.sessao')).toBeNull();
  });
});
