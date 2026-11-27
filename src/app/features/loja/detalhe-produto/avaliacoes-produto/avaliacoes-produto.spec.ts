import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLocalePtBr } from '../../../../core/locale';
import { AvaliacoesProduto } from './avaliacoes-produto';

const URL_AVALIACOES = '/api/produtos/game-stick/avaliacoes';

const umaAvaliacao = {
  media: 5,
  total: 1,
  avaliacoes: {
    itens: [
      {
        id: 1,
        nota: 5,
        comentario: 'Chegou rapidinho',
        autor: 'Mariana S.',
        criadoEm: '2026-11-27T10:00:00',
      },
    ],
    pagina: 0,
    tamanho: 5,
    totalItens: 1,
    totalPaginas: 1,
  },
};

function logar(): void {
  localStorage.setItem(
    'inovou.sessao',
    JSON.stringify({
      token: 'jwt',
      expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
      usuario: { id: 7, nome: 'Yago', email: 'yago@teste.com', role: 'CLIENTE' },
    }),
  );
}

describe('AvaliacoesProduto', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<AvaliacoesProduto>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLocalePtBr(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function atualizar(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function abrir(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(AvaliacoesProduto);
    fixture.componentRef.setInput('slug', 'game-stick');
    fixture.detectChanges();
    TestBed.tick();
    return fixture.nativeElement as HTMLElement;
  }

  it('visitante vê as avaliações e o convite para entrar', async () => {
    const tela = await abrir();
    http.expectOne((r) => r.url === URL_AVALIACOES).flush(umaAvaliacao);
    await atualizar();

    expect(tela.textContent).toContain('Mariana S.');
    expect(tela.textContent).toContain('Chegou rapidinho');
    expect(tela.textContent).toContain('1 avaliação');
    expect(tela.textContent).toContain('Entre na sua conta');
    expect(tela.querySelector('form')).toBeNull();
    http.expectNone(`${URL_AVALIACOES}/permissao`);
  });

  it('cliente que recebeu o produto escolhe a nota, comenta e envia', async () => {
    logar();
    const tela = await abrir();
    http
      .match((r) => r.url === URL_AVALIACOES)
      .forEach((r) =>
        r.flush({
          ...umaAvaliacao,
          media: null,
          total: 0,
          avaliacoes: { ...umaAvaliacao.avaliacoes, itens: [] },
        }),
      );
    http.expectOne(`${URL_AVALIACOES}/permissao`).flush({ podeAvaliar: true, motivo: null });
    await atualizar();

    (tela.querySelectorAll('.avaliar__estrela')[3] as HTMLButtonElement).click();
    fixture.detectChanges();
    const comentario = tela.querySelector('textarea') as HTMLTextAreaElement;
    comentario.value = '  Muito bom  ';
    comentario.dispatchEvent(new Event('input'));
    (tela.querySelector('form button[type="submit"]') as HTMLButtonElement).click();

    const envio = http.expectOne((r) => r.method === 'POST' && r.url === URL_AVALIACOES);
    expect(envio.request.body).toEqual({ nota: 4, comentario: 'Muito bom' });
    envio.flush({
      id: 9,
      nota: 4,
      comentario: 'Muito bom',
      autor: 'Yago',
      criadoEm: '2026-11-27T10:00:00',
    });
    TestBed.tick();

    expect(tela.textContent).toContain('Obrigado! Sua avaliação já aparece');
    http.match((r) => r.url === URL_AVALIACOES).forEach((r) => r.flush(umaAvaliacao));
    http
      .match(`${URL_AVALIACOES}/permissao`)
      .forEach((r) =>
        r.flush({ podeAvaliar: false, motivo: 'Você já avaliou este produto. Obrigado!' }),
      );
  });

  it('não deixa enviar sem nota', async () => {
    logar();
    const tela = await abrir();
    http.match((r) => r.url === URL_AVALIACOES).forEach((r) => r.flush(umaAvaliacao));
    http.expectOne(`${URL_AVALIACOES}/permissao`).flush({ podeAvaliar: true, motivo: null });
    await atualizar();

    (tela.querySelector('form button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(tela.textContent).toContain('Escolha uma nota de 1 a 5 estrelas.');
    http.expectNone((r) => r.method === 'POST');
  });
});
