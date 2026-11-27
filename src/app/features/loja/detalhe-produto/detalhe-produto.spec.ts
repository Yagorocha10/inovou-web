import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLocalePtBr } from '../../../core/locale';
import { DetalheProduto } from './detalhe-produto';

const produto = {
  id: 4,
  nome: 'Console portátil R36',
  slug: 'console-portatil-r36',
  descricao: 'Videogame portátil',
  preco: 40,
  estoque: 5,
  disponivel: true,
  categoria: { id: 3, nome: 'Games e controles', slug: 'games-e-controles' },
  imagens: [],
};

function logar(): void {
  localStorage.setItem(
    'inovou.sessao',
    JSON.stringify({
      token: 't',
      expiraEm: new Date(Date.now() + 60_000).toISOString(),
      usuario: { id: 1, nome: 'Yago', email: 'y@x.com', role: 'CLIENTE' },
    }),
  );
}

describe('DetalheProduto', () => {
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DetalheProduto],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocalePtBr(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  async function abrir(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(DetalheProduto);
    fixture.componentRef.setInput('slug', produto.slug);
    fixture.detectChanges();
    TestBed.tick();
    http
      .match('/api/carrinho')
      .forEach((requisicao) =>
        requisicao.flush({ itens: [], quantidadeTotal: 0, subtotal: 0, podeFinalizar: false }),
      );
    http.expectOne('/api/produtos/console-portatil-r36').flush(produto);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function botao(tela: HTMLElement, texto: string): HTMLButtonElement {
    return Array.from(tela.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(texto),
    ) as HTMLButtonElement;
  }

  it('comprar agora adiciona ao carrinho e vai para o checkout', async () => {
    logar();
    const tela = await abrir();

    botao(tela, 'Comprar agora').click();
    const requisicao = http.expectOne('/api/carrinho/itens');
    expect(requisicao.request.body).toEqual({ produtoId: 4, quantidade: 1 });
    requisicao.flush({ itens: [], quantidadeTotal: 1, subtotal: 40, podeFinalizar: true });

    expect(router.navigate).toHaveBeenCalledWith(['/checkout']);
  });

  it('comprar agora sem login leva para entrar e volta ao produto', async () => {
    const tela = await abrir();

    botao(tela, 'Comprar agora').click();

    http.expectNone('/api/carrinho/itens');
    expect(router.navigate).toHaveBeenCalledWith(['/entrar'], {
      queryParams: { retorno: '/produtos/console-portatil-r36' },
    });
  });
});
