import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ProdutoAdmin } from '../../../core/models/admin';
import { CategoriaService } from '../../../core/services/categoria.service';
import { AdminProdutosService } from '../../../core/services/admin-produtos.service';
import { provideLocalePtBr } from '../../../core/locale';
import { ListaProdutosAdmin } from './lista-produtos-admin';

const produto: ProdutoAdmin = {
  id: 12,
  nome: 'Console portátil',
  slug: 'console-portatil',
  descricao: 'Console de teste',
  preco: 499.9,
  estoque: 4,
  ativo: true,
  categoria: { id: 3, nome: 'Games', slug: 'games' },
  imagens: [{ id: 1, url: '/uploads/console.png', ordem: 0 }],
};

function pagina(
  itens: ProdutoAdmin[],
  atual = 0,
  totalPaginas = itens.length ? 1 : 0,
  totalItens = itens.length,
) {
  return { itens, pagina: atual, tamanho: 10, totalItens, totalPaginas };
}

describe('ListaProdutosAdmin', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;
  let categoriaServiceMock: { listar: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    categoriaServiceMock = {
      listar: vi.fn().mockReturnValue(of([{ id: 3, nome: 'Games', slug: 'games' }])),
    };
    await TestBed.configureTestingModule({
      imports: [ListaProdutosAdmin],
      providers: [
        provideRouter([{ path: 'admin/produtos', component: ListaProdutosAdmin }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocalePtBr(),
        {
          provide: CategoriaService,
          useValue: categoriaServiceMock,
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
  });

  async function abrir(url = '/admin/produtos'): Promise<RouterTestingHarness> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, ListaProdutosAdmin);
    return harness;
  }

  function requisicaoProdutos(
    validar?: (params: URLSearchParams) => boolean,
  ) {
    return http.expectOne((requisicao) => {
      if (requisicao.url !== '/api/admin/produtos') {
        return false;
      }
      const params = new URLSearchParams(requisicao.params.toString());
      return validar ? validar(params) : true;
    });
  }

  async function aguardarUrl(url: string): Promise<void> {
    await vi.waitFor(() => expect(router.url).toContain(url));
  }

  async function aguardarRota(url: string): Promise<void> {
    await vi.waitFor(() => expect(router.url).toBe(url));
  }

  it('carrega e apresenta a listagem, incluindo imagem, preço e situação', async () => {
    const paginaTeste = await abrir();
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Carregando produtos');

    requisicaoProdutos().flush(pagina([produto]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    const elemento = paginaTeste.routeNativeElement as HTMLElement;
    expect(elemento.querySelector('tbody tr')).not.toBeNull();
    expect(elemento.querySelector('.imagem-produto')?.getAttribute('src')).toBe('/uploads/console.png');
    expect(elemento.textContent).toContain('Console portátil');
    expect(elemento.textContent).toContain('Games');
    expect(elemento.textContent).toContain('R$ 499,90');
    expect(elemento.textContent).toContain('Ativo');
    expect(elemento.querySelector('a[href="/admin/produtos/novo"]')?.textContent).toContain('Novo produto');
  });

  it('aplica busca por nome após debounce e sincroniza o valor na URL', async () => {
    const paginaTeste = await abrir();
    requisicaoProdutos().flush(pagina([produto]));
    paginaTeste.detectChanges();

    const input = paginaTeste.routeNativeElement?.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = '  console  ';
    input.dispatchEvent(new Event('input'));
    await new Promise((resolver) => setTimeout(resolver, 350));
    await aguardarUrl('busca=console');

    requisicaoProdutos((params) => params.get('busca') === 'console').flush(pagina([produto]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();
    expect(router.parseUrl(router.url).queryParams['busca']).toBe('console');
  });

  it('descarta entradas rápidas e envia somente o termo final', async () => {
    const paginaTeste = await abrir();
    requisicaoProdutos().flush(pagina([produto]));
    await paginaTeste.fixture.whenStable();

    const input = paginaTeste.routeNativeElement?.querySelector('input[type="search"]') as HTMLInputElement;
    const digitar = async (valor: string) => {
      input.value = valor;
      input.dispatchEvent(new Event('input'));
      await new Promise((resolver) => setTimeout(resolver, 100));
    };
    await digitar('ga');
    await digitar('game');
    input.value = 'games stick';
    input.dispatchEvent(new Event('input'));
    await new Promise((resolver) => setTimeout(resolver, 350));
    await aguardarUrl('busca=games');

    const requisiçãoFinal = requisicaoProdutos((params) => params.get('busca') === 'games stick');
    http.expectNone((requisicao) => requisicao.url === '/api/admin/produtos' && requisicao.params.get('busca') !== 'games stick');
    requisiçãoFinal.flush(pagina([produto]));
    expect(router.parseUrl(router.url).queryParams['busca']).toBe('games stick');
  });

  it('voltar e avançar cancelam busca pendente e restauram o termo da URL', async () => {
    const paginaTeste = await abrir('/admin/produtos?busca=anterior');
    requisicaoProdutos((params) => params.get('busca') === 'anterior').flush(pagina([produto]));
    await paginaTeste.fixture.whenStable();

    await router.navigateByUrl('/admin/produtos?busca=original');
    await aguardarUrl('busca=original');
    paginaTeste.detectChanges();
    requisicaoProdutos((params) => params.get('busca') === 'original').flush(pagina([produto]));
    await paginaTeste.fixture.whenStable();

    const input = paginaTeste.routeNativeElement?.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'termo pendente';
    input.dispatchEvent(new Event('input'));
    await router.navigateByUrl('/admin/produtos?busca=anterior');
    await aguardarUrl('busca=anterior');
    paginaTeste.detectChanges();
    requisicaoProdutos((params) => params.get('busca') === 'anterior').flush(pagina([produto]));
    await paginaTeste.fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver, 350));

    expect(router.url).toContain('busca=anterior');
    expect((paginaTeste.routeNativeElement?.querySelector('input[type="search"]') as HTMLInputElement).value).toBe('anterior');

    await router.navigateByUrl('/admin/produtos?busca=original');
    await aguardarUrl('busca=original');
    paginaTeste.detectChanges();
    requisicaoProdutos((params) => params.get('busca') === 'original').flush(pagina([produto]));
    await paginaTeste.fixture.whenStable();
    expect((paginaTeste.routeNativeElement?.querySelector('input[type="search"]') as HTMLInputElement).value).toBe('original');
    http.expectNone((requisicao) => requisicao.url === '/api/admin/produtos' && requisicao.params.get('busca') === 'termo pendente');
  });

  it('filtra por categoria e redefine a página na URL', async () => {
    const paginaTeste = await abrir('/admin/produtos?pagina=2');
    requisicaoProdutos((params) => params.get('pagina') === '2').flush(pagina([produto], 2, 3, 21));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    const select = paginaTeste.routeNativeElement?.querySelectorAll('select')[0] as HTMLSelectElement;
    select.value = '3';
    select.dispatchEvent(new Event('change'));
    await aguardarUrl('categoriaId=3');

    requisicaoProdutos(
      (params) => params.get('categoriaId') === '3' && params.get('pagina') === '0',
    ).flush(pagina([produto]));
    await paginaTeste.fixture.whenStable();
    expect(router.parseUrl(router.url).queryParams['pagina']).toBeUndefined();
  });

  it('filtra por situação e mantém o filtro sincronizado com a URL', async () => {
    const paginaTeste = await abrir();
    requisicaoProdutos().flush(pagina([produto]));
    paginaTeste.detectChanges();

    const select = paginaTeste.routeNativeElement?.querySelectorAll('select')[1] as HTMLSelectElement;
    select.value = 'INATIVOS';
    select.dispatchEvent(new Event('change'));
    await aguardarUrl('situacao=INATIVOS');

    requisicaoProdutos((params) => params.get('situacao') === 'INATIVOS').flush(pagina([]));
    await paginaTeste.fixture.whenStable();
    expect(router.parseUrl(router.url).queryParams['situacao']).toBe('INATIVOS');
  });

  it('sincroniza os filtros existentes na URL com controles e requisição', async () => {
    const paginaTeste = await abrir('/admin/produtos?busca=console&categoriaId=3&situacao=ATIVOS&pagina=1');
    const requisicao = requisicaoProdutos((params) =>
      params.get('busca') === 'console' &&
      params.get('categoriaId') === '3' &&
      params.get('situacao') === 'ATIVOS' &&
      params.get('pagina') === '1',
    );
    requisicao.flush(pagina([produto], 1, 2, 11));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    const elemento = paginaTeste.routeNativeElement as HTMLElement;
    expect((elemento.querySelector('input[type="search"]') as HTMLInputElement).value).toBe('console');
    expect((elemento.querySelectorAll('select')[0] as HTMLSelectElement).value).toBe('3');
    expect((elemento.querySelectorAll('select')[1] as HTMLSelectElement).value).toBe('ATIVOS');
    expect(elemento.textContent).toContain('Página 2 de 2');
  });

  it('clampa página fora do intervalo e preserva os filtros atuais', async () => {
    const paginaTeste = await abrir(
      '/admin/produtos?busca=console&categoriaId=3&situacao=ATIVOS&pagina=9',
    );
    requisicaoProdutos((params) => params.get('pagina') === '9').flush(pagina([], 9, 3, 25));
    await aguardarUrl('pagina=2');

    const requisicaoValida = requisicaoProdutos(
      (params) =>
        params.get('busca') === 'console' &&
        params.get('categoriaId') === '3' &&
        params.get('situacao') === 'ATIVOS' &&
        params.get('pagina') === '2',
    );
    requisicaoValida.flush(pagina([produto], 2, 3, 25));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    expect(router.parseUrl(router.url).queryParams).toEqual({
      busca: 'console',
      categoriaId: '3',
      situacao: 'ATIVOS',
      pagina: '2',
    });
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Página 3 de 3');
    expect((paginaTeste.routeNativeElement?.querySelector('.paginacao button:last-child') as HTMLButtonElement).disabled).toBe(true);
  });

  it('normaliza busca, situação e página inválidas preservando parâmetros válidos', async () => {
    const paginaTeste = await abrir(
      '/admin/produtos?busca=%20%20&situacao=DESCONHECIDA&pagina=-2&preservado=sim',
    );
    await aguardarRota('/admin/produtos?preservado=sim');

    const requisicao = requisicaoProdutos((params) =>
      !params.has('busca') && params.get('situacao') === 'TODOS' && params.get('pagina') === '0',
    );
    requisicao.flush(pagina([]));
    await paginaTeste.fixture.whenStable();

    expect(router.parseUrl(router.url).queryParams).toEqual({ preservado: 'sim' });
  });

  it('remove categoria inexistente após carregar categorias e preserva os demais filtros', async () => {
    const paginaTeste = await abrir('/admin/produtos?categoriaId=999&busca=controle&keep=1');
    requisicaoProdutos((params) => params.get('categoriaId') === '999').flush(pagina([produto]));
    await vi.waitFor(() =>
      expect(router.parseUrl(router.url).queryParams['categoriaId']).toBeUndefined(),
    );

    const requisicao = requisicaoProdutos(
      (params) => params.get('busca') === 'controle' && !params.has('categoriaId'),
    );
    requisicao.flush(pagina([produto]));
    await paginaTeste.fixture.whenStable();

    expect(router.parseUrl(router.url).queryParams).toEqual({ busca: 'controle', keep: '1' });
  });

  it('altera o número da página e atualiza a query string', async () => {
    const paginaTeste = await abrir();
    requisicaoProdutos().flush(pagina([produto], 0, 3, 21));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    (paginaTeste.routeNativeElement?.querySelector('.paginacao button:last-child') as HTMLButtonElement).click();
    await aguardarUrl('pagina=1');
    requisicaoProdutos((params) => params.get('pagina') === '1').flush(pagina([produto], 1, 3, 21));

    expect(router.parseUrl(router.url).queryParams['pagina']).toBe('1');
  });

  it('mantém busca, categoria e situação ao paginar', async () => {
    const paginaTeste = await abrir(
      '/admin/produtos?busca=console&categoriaId=3&situacao=ATIVOS',
    );
    requisicaoProdutos((params) => params.get('pagina') === '0').flush(pagina([produto], 0, 3, 21));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    (paginaTeste.routeNativeElement?.querySelector('.paginacao button:last-child') as HTMLButtonElement).click();
    await aguardarUrl('pagina=1');
    requisicaoProdutos(
      (params) =>
        params.get('busca') === 'console' &&
        params.get('categoriaId') === '3' &&
        params.get('situacao') === 'ATIVOS' &&
        params.get('pagina') === '1',
    ).flush(pagina([produto], 1, 3, 21));
    await paginaTeste.fixture.whenStable();

    expect(router.parseUrl(router.url).queryParams).toEqual({
      busca: 'console',
      categoriaId: '3',
      situacao: 'ATIVOS',
      pagina: '1',
    });
  });

  it('não apresenta catálogo vazio por página inválida e mantém vazio quando o catálogo não tem itens', async () => {
    const paginaTeste = await abrir('/admin/produtos?pagina=4');
    requisicaoProdutos((params) => params.get('pagina') === '4').flush(pagina([], 4, 0, 0));
    await aguardarRota('/admin/produtos');
    expect(paginaTeste.routeNativeElement?.textContent).not.toContain('Nenhum produto cadastrado.');

    requisicaoProdutos((params) => params.get('pagina') === '0').flush(pagina([], 0, 0, 0));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Nenhum produto cadastrado.');
    expect(paginaTeste.routeNativeElement?.textContent).not.toContain('página solicitada não existe');
  });

  it('cancela resposta antiga da listagem quando filtros mais recentes são aplicados', async () => {
    const paginaTeste = await abrir();
    const requisicaoAntiga = requisicaoProdutos();

    await router.navigateByUrl('/admin/produtos?busca=recente');
    await aguardarUrl('busca=recente');
    paginaTeste.detectChanges();
    expect(requisicaoAntiga.cancelled).toBe(true);

    const produtoRecente: ProdutoAdmin = { ...produto, id: 21, nome: 'Resultado recente' };
    requisicaoProdutos((params) => params.get('busca') === 'recente').flush(pagina([produtoRecente]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    expect(paginaTeste.routeNativeElement?.textContent).toContain('Resultado recente');
    expect(paginaTeste.routeNativeElement?.textContent).not.toContain('Console portátil');
  });

  it('limpa a resposta local do PATCH ao carregar novamente os mesmos produtos', async () => {
    const paginaTeste = await abrir();
    requisicaoProdutos().flush(pagina([produto]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    (paginaTeste.routeNativeElement?.querySelector('button[aria-label="Desativar Console portátil"]') as HTMLButtonElement).click();
    http.expectOne('/api/admin/produtos/12/ativo').flush({ ...produto, ativo: false });
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();
    expect(paginaTeste.routeNativeElement?.querySelector('.situacao')?.textContent).toContain('Inativo');

    (paginaTeste.routeNativeElement?.querySelector('button[aria-label="Ativar Console portátil"]') as HTMLButtonElement).click();
    http.expectOne('/api/admin/produtos/12/ativo').flush({ ...produto, ativo: true });
    await paginaTeste.fixture.whenStable();

    await router.navigateByUrl('/admin/produtos?categoriaId=3');
    await aguardarUrl('categoriaId=3');
    paginaTeste.detectChanges();
    requisicaoProdutos((params) => params.get('categoriaId') === '3').flush(pagina([{ ...produto, ativo: false }]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();
    expect(paginaTeste.routeNativeElement?.querySelector('.situacao')?.textContent).toContain('Inativo');
  });

  it('escolhe a imagem principal pela menor ordem', async () => {
    const paginaTeste = await abrir();
    const produtoComImagens: ProdutoAdmin = {
      ...produto,
      imagens: [
        { id: 4, url: '/uploads/terceira.png', ordem: 2 },
        { id: 2, url: '/uploads/primeira.png', ordem: 0 },
        { id: 3, url: '/uploads/segunda.png', ordem: 1 },
      ],
    };
    requisicaoProdutos().flush(pagina([produtoComImagens]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    expect(paginaTeste.routeNativeElement?.querySelector('.imagem-produto')?.getAttribute('src')).toBe('/uploads/primeira.png');
  });

  it('ativa produto inativo enviando true e aplicando o retorno do PATCH', async () => {
    const paginaTeste = await abrir();
    requisicaoProdutos().flush(pagina([{ ...produto, ativo: false }]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    (paginaTeste.routeNativeElement?.querySelector('button[aria-label="Ativar Console portátil"]') as HTMLButtonElement).click();
    const requisicao = http.expectOne('/api/admin/produtos/12/ativo');
    expect(requisicao.request.body).toEqual({ ativo: true });
    requisicao.flush({ ...produto, ativo: true });
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();
    expect(paginaTeste.routeNativeElement?.querySelector('.situacao')?.textContent).toContain('Ativo');
  });

  it('remove produto desativado dos resultados ATIVOS e atualiza contagem e paginação', async () => {
    const paginaTeste = await abrir('/admin/produtos?situacao=ATIVOS');
    requisicaoProdutos((params) => params.get('situacao') === 'ATIVOS').flush(pagina([produto], 0, 1, 1));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    (paginaTeste.routeNativeElement?.querySelector('button[aria-label="Desativar Console portátil"]') as HTMLButtonElement).click();
    const patchAtivo = http.expectOne('/api/admin/produtos/12/ativo');
    expect(patchAtivo.request.body).toEqual({ ativo: false });
    patchAtivo.flush({ ...produto, ativo: false });
    paginaTeste.detectChanges();

    const recarga = requisicaoProdutos(
      (params) => params.get('situacao') === 'ATIVOS' && params.get('pagina') === '0',
    );
    recarga.flush(pagina([], 0, 0, 0));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    expect(paginaTeste.routeNativeElement?.querySelector('tbody tr')).toBeNull();
    expect(paginaTeste.routeNativeElement?.textContent).toContain('0 produtos cadastrados');
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Nenhum produto encontrado para os filtros atuais.');
    expect(paginaTeste.routeNativeElement?.textContent).not.toContain('Console portátil');
  });

  it('remove produto ativado dos resultados INATIVOS e atualiza contagem e paginação', async () => {
    const paginaTeste = await abrir('/admin/produtos?situacao=INATIVOS');
    requisicaoProdutos((params) => params.get('situacao') === 'INATIVOS').flush(
      pagina([{ ...produto, ativo: false }], 0, 1, 1),
    );
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    (paginaTeste.routeNativeElement?.querySelector('button[aria-label="Ativar Console portátil"]') as HTMLButtonElement).click();
    const patchAtivo = http.expectOne('/api/admin/produtos/12/ativo');
    expect(patchAtivo.request.body).toEqual({ ativo: true });
    patchAtivo.flush({ ...produto, ativo: true });
    paginaTeste.detectChanges();

    const recarga = requisicaoProdutos(
      (params) => params.get('situacao') === 'INATIVOS' && params.get('pagina') === '0',
    );
    recarga.flush(pagina([], 0, 0, 0));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    expect(paginaTeste.routeNativeElement?.querySelector('tbody tr')).toBeNull();
    expect(paginaTeste.routeNativeElement?.textContent).toContain('0 produtos cadastrados');
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Nenhum produto encontrado para os filtros atuais.');
    expect(paginaTeste.routeNativeElement?.textContent).not.toContain('Console portátil');
  });

  it('ativa produto com PATCH, atualiza a linha pela resposta e impede chamadas simultâneas', async () => {
    const paginaTeste = await abrir();
    requisicaoProdutos().flush(pagina([produto]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    const botao = paginaTeste.routeNativeElement?.querySelector('button[aria-label="Desativar Console portátil"]') as HTMLButtonElement;
    botao.click();
    const requisicao = http.expectOne('/api/admin/produtos/12/ativo');
    expect(requisicao.request.method).toBe('PATCH');
    expect(requisicao.request.body).toEqual({ ativo: false });
    paginaTeste.detectChanges();
    expect(botao.disabled).toBe(true);
    botao.click();
    http.expectNone('/api/admin/produtos/12/ativo');

    requisicao.flush({ ...produto, ativo: false });
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Produto desativado com sucesso.');
    expect(paginaTeste.routeNativeElement?.querySelector('.situacao')?.textContent).toContain('Inativo');
  });

  it('desativa um produto e apresenta feedback de erro da API', async () => {
    const paginaTeste = await abrir();
    requisicaoProdutos().flush(pagina([produto]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    (paginaTeste.routeNativeElement?.querySelector('button[aria-label="Desativar Console portátil"]') as HTMLButtonElement).click();
    http.expectOne('/api/admin/produtos/12/ativo').flush(
      { mensagem: 'Falha ao atualizar produto.' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    expect(paginaTeste.routeNativeElement?.textContent).toContain('Falha ao atualizar produto.');
    expect(paginaTeste.routeNativeElement?.querySelector('.situacao')?.textContent).toContain('Ativo');
  });

  it('mostra erro de carregamento e permite tentar novamente', async () => {
    const paginaTeste = await abrir();
    requisicaoProdutos().flush(
      { mensagem: 'A API não conseguiu consultar o catálogo.' },
      { status: 502, statusText: 'Bad Gateway' },
    );
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();
    expect(paginaTeste.routeNativeElement?.textContent).toContain('A API não conseguiu consultar o catálogo.');

    (paginaTeste.routeNativeElement?.querySelector('button') as HTMLButtonElement).click();
    paginaTeste.detectChanges();
    requisicaoProdutos().flush(pagina([produto]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Console portátil');
  });

  it('mantém a listagem se as categorias falharem e recupera ao tentar novamente', async () => {
    categoriaServiceMock.listar
      .mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 503,
              statusText: 'Service Unavailable',
              error: { mensagem: 'Categorias temporariamente indisponíveis.' },
            }),
        ),
      )
      .mockReturnValueOnce(of([{ id: 3, nome: 'Games', slug: 'games' }]));

    const paginaTeste = await abrir();
    requisicaoProdutos().flush(pagina([produto]));
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    expect(paginaTeste.routeNativeElement?.textContent).toContain('Categorias temporariamente indisponíveis.');
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Console portátil');
    expect((paginaTeste.routeNativeElement?.querySelector('select') as HTMLSelectElement).disabled).toBe(true);

    const botao = Array.from(paginaTeste.routeNativeElement?.querySelectorAll('button') ?? []).find(
      (item) => item.textContent?.includes('Tentar carregar categorias novamente'),
    ) as HTMLButtonElement;
    botao.click();
    await paginaTeste.fixture.whenStable();
    paginaTeste.detectChanges();

    expect(categoriaServiceMock.listar).toHaveBeenCalledTimes(2);
    expect(paginaTeste.routeNativeElement?.textContent).not.toContain('Categorias temporariamente indisponíveis.');
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Console portátil');
    expect(paginaTeste.routeNativeElement?.textContent).toContain('Games');
    expect((paginaTeste.routeNativeElement?.querySelector('select') as HTMLSelectElement).disabled).toBe(false);
  });

  it('distingue lista vazia de nenhum resultado filtrado', async () => {
    const semFiltros = await abrir();
    requisicaoProdutos().flush(pagina([]));
    await semFiltros.fixture.whenStable();
    semFiltros.detectChanges();
    expect(semFiltros.routeNativeElement?.textContent).toContain('Nenhum produto cadastrado.');

    await semFiltros.navigateByUrl('/admin/produtos?busca=inexistente', ListaProdutosAdmin);
    const comFiltro = semFiltros;
    requisicaoProdutos((params) => params.get('busca') === 'inexistente').flush(pagina([]));
    await comFiltro.fixture.whenStable();
    comFiltro.detectChanges();
    expect(comFiltro.routeNativeElement?.textContent).toContain(
      'Nenhum produto encontrado para os filtros atuais.',
    );
  });
});
