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
    expect(service.statusCarregamento()).toBe('success');
  });

  it('deve expor falha sem tratar carrinho não carregado como vazio e permitir nova tentativa', () => {
    logar();
    const service = criar();

    expect(service.statusCarregamento()).toBe('loading');
    http.expectOne('/api/carrinho').flush(
      { mensagem: 'Falha temporária' },
      { status: 503, statusText: 'Service Unavailable' },
    );

    expect(service.statusCarregamento()).toBe('error');
    expect(service.carrinho()).toBeNull();

    service.carregar();
    expect(service.statusCarregamento()).toBe('loading');
    http.expectOne('/api/carrinho').flush(carrinhoComDoisItens);

    expect(service.statusCarregamento()).toBe('success');
    expect(service.carrinho()).toEqual(carrinhoComDoisItens);
  });

  it('ignora uma resposta antiga se outro carregamento foi iniciado', () => {
    logar();
    const service = criar();
    service.carregar();

    const [requisicaoAntiga, requisicaoAtual] = http.match('/api/carrinho');
    expect(service.statusCarregamento()).toBe('loading');
    requisicaoAntiga.flush(carrinhoComDoisItens);

    expect(service.carrinho()).toBeNull();
    expect(service.statusCarregamento()).toBe('loading');
    requisicaoAtual.flush({ itens: [], quantidadeTotal: 0, subtotal: 0, podeFinalizar: false });

    expect(service.carrinho()?.itens).toEqual([]);
    expect(service.statusCarregamento()).toBe('success');
  });

  it('ignora o carregamento pendente quando uma alteração do carrinho conclui depois', () => {
    logar();
    const service = criar();
    service.adicionar(4, 2).subscribe();
    const busca = http.expectOne('/api/carrinho');
    const alteracao = http.expectOne('/api/carrinho/itens');
    alteracao.flush(carrinhoComDoisItens);

    expect(service.carrinho()).toEqual(carrinhoComDoisItens);
    expect(service.statusCarregamento()).toBe('success');

    busca.flush({ itens: [], quantidadeTotal: 0, subtotal: 0, podeFinalizar: false });
    expect(service.carrinho()).toEqual(carrinhoComDoisItens);
    expect(service.quantidadeTotal()).toBe(2);
  });

  it('limpa o valor antigo enquanto recarrega e mantém falha diferente de carrinho vazio', () => {
    logar();
    const service = criar();
    http.expectOne('/api/carrinho').flush(carrinhoComDoisItens);

    service.carregar();
    expect(service.carrinho()).toBeNull();
    expect(service.statusCarregamento()).toBe('loading');

    http.expectOne('/api/carrinho').flush(
      { mensagem: 'Falha temporária' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    expect(service.carrinho()).toBeNull();
    expect(service.statusCarregamento()).toBe('error');
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
