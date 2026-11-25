import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Entrar } from './entrar';

describe('Entrar', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Entrar],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  function preencher(elemento: HTMLElement, seletor: string, valor: string): void {
    const campo = elemento.querySelector(seletor) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new Event('blur'));
  }

  it('não deve chamar a API com o formulário vazio', async () => {
    const fixture = TestBed.createComponent(Entrar);
    await fixture.whenStable();
    const pagina = fixture.nativeElement as HTMLElement;

    (pagina.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    http.expectNone('/api/auth/login');
    expect(pagina.querySelectorAll('.campo__erro').length).toBe(2);
  });

  it('deve mostrar a mensagem da API quando a senha estiver errada', async () => {
    const fixture = TestBed.createComponent(Entrar);
    await fixture.whenStable();
    const pagina = fixture.nativeElement as HTMLElement;
    preencher(pagina, 'input[type=email]', 'yago@exemplo.com');
    preencher(pagina, 'input[type=password]', 'errada');

    (pagina.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    http
      .expectOne('/api/auth/login')
      .flush(
        { status: 401, mensagem: 'E-mail ou senha inválidos' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await fixture.whenStable();

    expect(pagina.querySelector('.alerta')?.textContent).toContain('E-mail ou senha inválidos');
  });

  it('deve voltar para a página de origem depois de entrar', async () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Entrar);
    fixture.componentRef.setInput('retorno', '/produtos/game-stick');
    await fixture.whenStable();
    const pagina = fixture.nativeElement as HTMLElement;
    preencher(pagina, 'input[type=email]', 'yago@exemplo.com');
    preencher(pagina, 'input[type=password]', 'senhaForte1');

    (pagina.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    http.expectOne('/api/auth/login').flush({
      token: 't',
      expiraEm: new Date(Date.now() + 60_000).toISOString(),
      usuario: { id: 1, nome: 'Yago', email: 'yago@exemplo.com', role: 'CLIENTE' },
    });

    expect(navegar).toHaveBeenCalledWith('/produtos/game-stick');
  });
});
