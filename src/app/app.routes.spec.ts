import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { adminGuard } from './core/guards/auth.guards';
import { alteracoesNaoSalvasGuard } from './core/guards/alteracoes-nao-salvas.guard';
import { routes } from './app.routes';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

function sessao(role: 'CLIENTE' | 'ADMIN'): void {
  localStorage.setItem(
    'inovou.sessao',
    JSON.stringify({
      token: 'token-teste',
      expiraEm: new Date(Date.now() + 60_000).toISOString(),
      usuario: { id: 1, nome: 'Teste', email: 'teste@example.com', role },
    }),
  );
}

function acessarAdmin(): boolean | UrlTree {
  return TestBed.runInInjectionContext(() =>
    adminGuard({} as ActivatedRouteSnapshot, { url: '/admin' } as RouterStateSnapshot),
  ) as boolean | UrlTree;
}

describe('rotas administrativas', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient()] });
  });

  it('protege /admin e declara as rotas filhas carregadas sob demanda', () => {
    const rotaAdmin = routes.find((rota) => rota.path === 'admin');
    expect(rotaAdmin?.canActivate).toContain(adminGuard);

    const filhas = rotaAdmin?.children ?? [];
    expect(filhas.filter((rota) => rota.path !== '**').map((rota) => rota.path)).toEqual([
      '',
      'produtos',
      'produtos/novo',
      'produtos/:id',
      'pedidos',
      'pedidos/:id',
    ]);
    expect(filhas.every((rota) => typeof rota.loadComponent === 'function')).toBe(true);
    expect(filhas.find((rota) => rota.path === 'produtos/novo')?.canDeactivate).toContain(
      alteracoesNaoSalvasGuard,
    );
    expect(filhas.find((rota) => rota.path === 'produtos/:id')?.canDeactivate).toContain(
      alteracoesNaoSalvasGuard,
    );
    expect(filhas.some((rota) => rota.path === 'produtos/:id/editar')).toBe(false);
    const fallback = filhas.find((rota) => rota.path === '**');
    expect(typeof fallback?.loadComponent).toBe('function');
  });

  it('redireciona visitante não autenticado de /admin para o login', () => {
    const resultado = acessarAdmin();

    expect(resultado).toBeInstanceOf(UrlTree);
    expect((resultado as UrlTree).toString()).toBe('/entrar?retorno=%2Fadmin');
  });

  it('redireciona usuário comum que acessa /admin para a página inicial', () => {
    sessao('CLIENTE');

    const resultado = acessarAdmin();

    expect(resultado).toBeInstanceOf(UrlTree);
    expect((resultado as UrlTree).toString()).toBe('/');
  });

  it('permite que um administrador acesse /admin', () => {
    sessao('ADMIN');

    expect(acessarAdmin()).toBe(true);
  });

  it('mostra o fallback administrativo para URLs desconhecidas com retorno ao painel', async () => {
    sessao('ADMIN');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/secao-inexistente');

    expect(harness.routeNativeElement?.textContent).toContain('Página administrativa não encontrada');
    expect(
      harness.routeNativeElement?.querySelector('.estado-admin a[href="/admin"]')?.textContent,
    ).toContain('Voltar ao painel');
  });
});
