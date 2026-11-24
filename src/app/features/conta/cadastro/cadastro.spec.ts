import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Cadastro } from './cadastro';

describe('Cadastro', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Cadastro],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  function preencher(elemento: HTMLElement, nome: string, valor: string): void {
    const campo = elemento.querySelector(`[formControlName=${nome}]`) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new Event('blur'));
  }

  it('deve avisar quando as senhas forem diferentes e não chamar a API', async () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Cadastro);
    await fixture.whenStable();
    const pagina = fixture.nativeElement as HTMLElement;
    preencher(pagina, 'nome', 'Yago');
    preencher(pagina, 'email', 'yago@exemplo.com');
    preencher(pagina, 'senha', 'senhaForte1');
    preencher(pagina, 'confirmacao', 'outraSenha1');

    (pagina.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    http.expectNone('/api/auth/cadastro');
    expect(pagina.textContent).toContain('As senhas não são iguais.');
  });

  it('deve mostrar o erro de e-mail já cadastrado', async () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Cadastro);
    await fixture.whenStable();
    const pagina = fixture.nativeElement as HTMLElement;
    preencher(pagina, 'nome', 'Yago');
    preencher(pagina, 'email', 'yago@exemplo.com');
    preencher(pagina, 'senha', 'senhaForte1');
    preencher(pagina, 'confirmacao', 'senhaForte1');

    (pagina.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    const requisicao = http.expectOne('/api/auth/cadastro');
    expect(requisicao.request.body).toEqual({
      nome: 'Yago',
      email: 'yago@exemplo.com',
      senha: 'senhaForte1',
    });
    requisicao.flush(
      { status: 409, mensagem: 'Já existe uma conta com o e-mail yago@exemplo.com' },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();

    expect(pagina.querySelector('.alerta')?.textContent).toContain('Já existe uma conta');
  });
});
