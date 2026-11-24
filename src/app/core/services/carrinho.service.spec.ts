import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Carrinho } from '../models/carrinho';
import { AuthService } from './auth.service';
import { CarrinhoService } from './carrinho.service';

const carrinhoComDoisItens: Carrinho = {
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
  ],
  quantidadeTotal: 2,
  subtotal: 80,
  podeFinalizar: true,
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

describe('CarrinhoService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
  });

  function criar(): CarrinhoService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(CarrinhoService);
    TestBed.tick();
    return service;
  }

  it('não deve buscar o carrinho de quem não está logado', () => {
    const service = criar();

    http.expectNone('/api/carrinho');
    expect(service.quantidadeTotal()).toBe(0);
  });

  it('deve carregar o carrinho de quem já está logado', () => {
    logar();
    const service = criar();

    http.expectOne('/api/carrinho').flush(carrinhoComDoisItens);

    expect(service.quantidadeTotal()).toBe(2);
  });

  it('deve atualizar o contador ao adicionar e limpar ao sair', () => {
    logar();
    const service = criar();
    http
      .expectOne('/api/carrinho')
      .flush({ itens: [], quantidadeTotal: 0, subtotal: 0, podeFinalizar: false });

    service.adicionar(4, 2).subscribe();
    const requisicao = http.expectOne('/api/carrinho/itens');
    expect(requisicao.request.body).toEqual({ produtoId: 4, quantidade: 2 });
    requisicao.flush(carrinhoComDoisItens);
    expect(service.quantidadeTotal()).toBe(2);

    TestBed.inject(AuthService).sair();
    TestBed.tick();

    expect(service.carrinho()).toBeNull();
    expect(service.quantidadeTotal()).toBe(0);
  });
});
