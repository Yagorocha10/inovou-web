import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { adminGuard, authGuard } from './auth.guards';

function sessaoComo(role: 'CLIENTE' | 'ADMIN'): void {
  localStorage.setItem(
    'inovou.sessao',
    JSON.stringify({
      token: 't',
      expiraEm: new Date(Date.now() + 60_000).toISOString(),
      usuario: { id: 1, nome: 'Yago', email: 'y@x.com', role },
    }),
  );
}

function executar(guarda: typeof authGuard, url: string): boolean | UrlTree {
  return TestBed.runInInjectionContext(() =>
    guarda({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  ) as boolean | UrlTree;
}

describe('guards de autenticação', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  });

  it('authGuard manda visitante para o login guardando a página de retorno', () => {
    const resultado = executar(authGuard, '/conta');

    expect(resultado).toBeInstanceOf(UrlTree);
    expect((resultado as UrlTree).toString()).toBe('/entrar?retorno=%2Fconta');
  });

  it('authGuard libera quem está logado', () => {
    sessaoComo('CLIENTE');

    expect(executar(authGuard, '/conta')).toBe(true);
  });

  it('adminGuard manda cliente para a home e libera o admin', () => {
    sessaoComo('CLIENTE');
    expect((executar(adminGuard, '/admin') as UrlTree).toString()).toBe('/');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
    sessaoComo('ADMIN');
    expect(executar(adminGuard, '/admin')).toBe(true);
  });
});
