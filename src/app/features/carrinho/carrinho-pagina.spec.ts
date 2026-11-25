import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLocalePtBr } from '../../core/locale';
import { Carrinho } from '../../core/models/carrinho';
import { CarrinhoPagina } from './carrinho-pagina';

const carrinho: Carrinho = {
  itens: [
    {
      produtoId: 4,
      nome: 'Console portátil R36',
      slug: 'console-portatil-r36',
      imagem: null,
      precoUnitario: 40,
      quantidade: 2,
      subtotal: 80,
      estoqueDisponivel: 5,
      disponivel: true,
    },
    {
      produtoId: 5,
      nome: 'Game Stick',
      slug: 'game-stick',
      imagem: null,
      precoUnitario: 50,
      quantidade: 1,
      subtotal: 50,
      estoqueDisponivel: 0,
      disponivel: false,
    },
  ],
  quantidadeTotal: 3,
  subtotal: 130,
  podeFinalizar: false,
};

describe('CarrinhoPagina', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CarrinhoPagina],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocalePtBr(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  async function abrirCom(dados: Carrinho): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(CarrinhoPagina);
    fixture.detectChanges();
    http.expectOne('/api/carrinho').flush(dados);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('deve listar os itens, o total e avisar sobre o item indisponível', async () => {
    const pagina = await abrirCom(carrinho);

    expect(pagina.querySelectorAll('.item').length).toBe(2);
    expect(pagina.querySelector('.resumo__total')?.textContent?.replace(/\s/g, ' ')).toContain(
      'R$ 130,00',
    );
    expect(pagina.querySelector('.item--alerta .item__aviso')?.textContent).toContain(
      'indisponível',
    );
    expect(pagina.querySelector('.resumo .alerta')?.textContent).toContain('Ajuste os itens');
  });

  it('deve enviar a nova quantidade ao clicar em +', async () => {
    const pagina = await abrirCom(carrinho);

    (pagina.querySelector('.item [aria-label="Aumentar quantidade"]') as HTMLButtonElement).click();

    const requisicao = http.expectOne('/api/carrinho/itens/4');
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({ quantidade: 3 });
  });

  it('deve mostrar o estado vazio', async () => {
    const pagina = await abrirCom({
      itens: [],
      quantidadeTotal: 0,
      subtotal: 0,
      podeFinalizar: false,
    });

    expect(pagina.querySelector('.estado')?.textContent).toContain('Seu carrinho está vazio');
  });
});
