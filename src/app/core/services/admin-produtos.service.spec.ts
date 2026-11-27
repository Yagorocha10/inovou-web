import {
  HttpEvent,
  HttpEventType,
  HttpResponse,
  provideHttpClient,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProdutoAdmin } from '../models/admin';
import { AdminProdutosService } from './admin-produtos.service';

const produtoAdmin: ProdutoAdmin = {
  id: 8,
  nome: 'Console portátil',
  slug: 'console-portatil',
  descricao: 'Console de teste',
  preco: 400,
  estoque: 3,
  ativo: true,
  categoria: { id: 2, nome: 'Games', slug: 'games' },
  imagens: [{ id: 12, url: '/uploads/produto.png', ordem: 0 }],
};

describe('AdminProdutosService', () => {
  let service: AdminProdutosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminProdutosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista produtos, omitindo filtros vazios e preservando false e zero', () => {
    service
      .listar({ busca: '  ', categoriaId: undefined, situacao: undefined, ativo: false, pagina: 0 })
      .subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/admin/produtos');
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.has('busca')).toBe(false);
    expect(requisicao.request.params.has('categoriaId')).toBe(false);
    expect(requisicao.request.params.has('situacao')).toBe(false);
    expect(requisicao.request.params.get('ativo')).toBe('false');
    expect(requisicao.request.params.get('pagina')).toBe('0');
    requisicao.flush({ itens: [], pagina: 0, tamanho: 10, totalItens: 0, totalPaginas: 0 });
  });

  it('busca um produto pelo ID', () => {
    service.buscar(8).subscribe();

    const requisicao = http.expectOne('/api/admin/produtos/8');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({});
  });

  it('cria um produto com o payload administrativo', () => {
    const dados = {
      nome: 'Console portátil',
      descricao: 'Descrição',
      preco: 400,
      estoque: 3,
      categoriaId: 2,
      ativo: true,
    };
    service.criar(dados).subscribe();

    const requisicao = http.expectOne('/api/admin/produtos');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual(dados);
    requisicao.flush({});
  });

  it('atualiza um produto pelo ID', () => {
    const dados = {
      nome: 'Console portátil',
      descricao: 'Descrição revisada',
      preco: 420,
      estoque: 4,
      categoriaId: 2,
      ativo: true,
    };
    service.atualizar(8, dados).subscribe();

    const requisicao = http.expectOne('/api/admin/produtos/8');
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual(dados);
    requisicao.flush({});
  });

  it('altera a ativação com PATCH e o corpo ativo false', () => {
    service.atualizarAtivo(8, false).subscribe();

    const requisicao = http.expectOne('/api/admin/produtos/8/ativo');
    expect(requisicao.request.method).toBe('PATCH');
    expect(requisicao.request.body).toEqual({ ativo: false });
    requisicao.flush({});
  });

  it('envia imagem em FormData e emite progresso e resposta final', () => {
    const arquivo = new File(['imagem'], 'produto.png', { type: 'image/png' });
    const eventos: HttpEvent<ProdutoAdmin>[] = [];

    service.enviarImagem(8, arquivo).subscribe((evento) => eventos.push(evento));

    const requisicao = http.expectOne('/api/admin/produtos/8/imagens');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.reportProgress).toBe(true);
    expect(requisicao.request.body).toBeInstanceOf(FormData);
    expect((requisicao.request.body as FormData).get('arquivo')).toBe(arquivo);

    requisicao.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 });
    requisicao.flush(produtoAdmin);

    expect(
      eventos.find((evento) => evento.type === HttpEventType.UploadProgress),
    ).toEqual({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 });
    const resposta = eventos.find((evento) => evento instanceof HttpResponse);
    expect(resposta).toBeInstanceOf(HttpResponse);
    expect((resposta as HttpResponse<ProdutoAdmin>).body).toEqual(produtoAdmin);
  });

  it('remove somente a imagem informada', () => {
    let resposta: ProdutoAdmin | undefined;
    service.removerImagem(8, 12).subscribe((produto) => (resposta = produto));

    const requisicao = http.expectOne('/api/admin/produtos/8/imagens/12');
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(produtoAdmin);
    expect(resposta).toEqual(produtoAdmin);
  });

  it('ordena as imagens preservando a sequência de IDs enviada', () => {
    let resposta: ProdutoAdmin | undefined;
    service.ordenarImagens(8, [12, 9, 15]).subscribe((produto) => (resposta = produto));

    const requisicao = http.expectOne('/api/admin/produtos/8/imagens/ordem');
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({ ids: [12, 9, 15] });
    requisicao.flush(produtoAdmin);
    expect(resposta).toEqual(produtoAdmin);
  });
});
