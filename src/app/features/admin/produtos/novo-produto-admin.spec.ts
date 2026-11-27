import { provideHttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Categoria } from '../../../core/models/catalogo';
import { ProdutoAdmin } from '../../../core/models/admin';
import { alteracoesNaoSalvasGuard } from '../../../core/guards/alteracoes-nao-salvas.guard';
import { provideLocalePtBr } from '../../../core/locale';
import { NovoProdutoAdmin } from './novo-produto-admin';
import { EditarProdutoAdmin } from './editar-produto-admin';

@Component({ template: '<p>Lista administrativa</p>' })
class ListaAdminTeste {}

const categorias: Categoria[] = [{ id: 4, nome: 'Acessórios', slug: 'acessorios' }];

const produtoCriado: ProdutoAdmin = {
  id: 51,
  nome: 'Teclado compacto',
  slug: 'teclado-compacto',
  descricao: 'Teclado mecânico',
  preco: 249.9,
  estoque: 0,
  ativo: true,
  categoria: categorias[0],
  imagens: [],
};

describe('NovoProdutoAdmin', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovoProdutoAdmin, EditarProdutoAdmin, ListaAdminTeste],
      providers: [
        provideRouter([
          {
            path: 'admin/produtos/novo',
            component: NovoProdutoAdmin,
            canDeactivate: [alteracoesNaoSalvasGuard],
          },
          {
            path: 'admin/produtos/:id',
            component: EditarProdutoAdmin,
            canDeactivate: [alteracoesNaoSalvasGuard],
          },
          { path: 'admin/produtos', component: ListaAdminTeste },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocalePtBr(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  async function abrir(): Promise<RouterTestingHarness> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/produtos/novo', NovoProdutoAdmin);
    http.expectOne('/api/categorias').flush(categorias);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness;
  }

  function componente(): any {
    return harness.routeDebugElement?.componentInstance as any;
  }

  function preencherValido(): void {
    componente().formulario.setValue({
      nome: 'Teclado compacto',
      descricao: 'Teclado mecânico',
      preco: 249.9,
      precoAnterior: null,
      estoque: 0,
      categoriaId: 4,
      ativo: true,
    });
  }

  it('renderiza os campos e as categorias carregadas', async () => {
    const pagina = await abrir();
    const elemento = pagina.routeNativeElement as HTMLElement;

    expect(elemento.querySelector('input[formControlName="nome"]')).not.toBeNull();
    expect(elemento.querySelector('textarea[formControlName="descricao"]')).not.toBeNull();
    expect(elemento.querySelector('input[formControlName="preco"]')).not.toBeNull();
    expect(elemento.querySelector('input[formControlName="estoque"]')).not.toBeNull();
    expect(elemento.querySelector('select[formControlName="categoriaId"]')?.textContent).toContain('Acessórios');
    expect((elemento.querySelector('input[formControlName="ativo"]') as HTMLInputElement).checked).toBe(true);
    expect(elemento.textContent).toContain('Salvar produto');
    expect(elemento.textContent).toContain('Cancelar');
  });

  it('valida obrigatoriedade, limites, preço decimal, estoque inteiro e situação inicial', async () => {
    await abrir();
    const form = componente().formulario;

    expect(form.invalid).toBe(true);
    expect(form.controls.ativo.value).toBe(true);
    form.controls.nome.setValue('   ');
    expect(form.controls.nome.hasError('required')).toBe(true);
    form.controls.nome.setValue('x'.repeat(151));
    form.controls.descricao.setValue('x'.repeat(2001));
    form.controls.preco.setValue(0);
    form.controls.estoque.setValue(-1);
    expect(form.controls.nome.hasError('maxlength')).toBe(true);
    expect(form.controls.descricao.hasError('maxlength')).toBe(true);
    expect(form.controls.preco.hasError('min')).toBe(true);
    expect(form.controls.estoque.hasError('min')).toBe(true);

    form.controls.nome.setValue('Produto');
    form.controls.descricao.setValue('');
    form.controls.preco.setValue(10.123);
    form.controls.estoque.setValue(1.5);
    expect(form.controls.preco.hasError('pattern')).toBe(true);
    expect(form.controls.estoque.hasError('pattern')).toBe(true);

    form.controls.preco.setValue(null);
    form.controls.estoque.setValue(null);
    form.controls.categoriaId.setValue(null);
    expect(form.controls.preco.hasError('required')).toBe(true);
    expect(form.controls.estoque.hasError('required')).toBe(true);
    expect(form.controls.categoriaId.hasError('required')).toBe(true);
  });

  it('aceita uma categoria carregada e rejeita categoria inexistente', async () => {
    await abrir();
    const controle = componente().formulario.controls.categoriaId;

    controle.setValue(4);
    expect(controle.valid).toBe(true);
    controle.setValue(999);
    expect(controle.invalid).toBe(true);
    expect(controle.hasError('categoriaInvalida')).toBe(true);
  });

  it('revalida um ID de categoria alterado manualmente no controle', async () => {
    await abrir();
    const controle = componente().formulario.controls.categoriaId;
    controle.setValue(4);
    expect(controle.valid).toBe(true);

    controle.setValue(404);
    expect(controle.invalid).toBe(true);
    expect(componente().erroDoCampo('categoriaId')).toBe('Selecione uma categoria válida.');
  });

  it('bloqueia o POST quando o ID da categoria é inválido', async () => {
    await abrir();
    preencherValido();
    componente().formulario.controls.categoriaId.setValue(999);

    componente().cadastrar();
    expect(componente().formulario.controls.categoriaId.touched).toBe(true);
    http.expectNone('/api/admin/produtos');
  });

  it('não envia o formulário inválido', async () => {
    await abrir();
    componente().cadastrar();
    expect(componente().formulario.touched).toBe(true);
    http.expectNone('/api/admin/produtos');
  });

  it('apresenta estado de carregamento e permite tentar categorias novamente após erro', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/produtos/novo', NovoProdutoAdmin);
    expect(harness.routeNativeElement?.textContent).toContain('Carregando categorias');
    http.expectOne('/api/categorias').flush(
      { mensagem: 'Categorias indisponíveis.' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Não foi possível carregar as categorias.');

    (harness.routeNativeElement?.querySelector('button') as HTMLButtonElement).click();
    harness.detectChanges();
    http.expectOne('/api/categorias').flush(categorias);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Acessórios');
  });

  it('envia o payload DadosProduto e navega ao produto retornado com confirmação', async () => {
    const pagina = await abrir();
    preencherValido();
    componente().cadastrar();

    const requisicao = http.expectOne('/api/admin/produtos');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({
      nome: 'Teclado compacto',
      descricao: 'Teclado mecânico',
      preco: 249.9,
      estoque: 0,
      categoriaId: 4,
      ativo: true,
    });
    requisicao.flush(produtoCriado);
    await vi.waitFor(() => expect(router.url).toBe('/admin/produtos/51'));
    http.expectOne('/api/admin/produtos/51').flush(produtoCriado);
    await pagina.fixture.whenStable();
    pagina.detectChanges();

    expect(router.url).toBe('/admin/produtos/51');
    expect(pagina.routeNativeElement?.textContent).toContain('Produto cadastrado com sucesso.');
    expect(TestBed.inject(Location).getState()).not.toHaveProperty('produtoCadastrado');
    http.expectNone((req) => req.url.includes('/imagens'));

    await router.navigateByUrl('/admin/produtos');
    await router.navigateByUrl('/admin/produtos/51');
    pagina.detectChanges();
    http.expectOne('/api/admin/produtos/51').flush(produtoCriado);
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.textContent).not.toContain('Produto cadastrado com sucesso.');
  });

  it('não mostra confirmação falsa ao acessar diretamente a rota de produto', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/produtos/77', EditarProdutoAdmin);
    http.expectOne('/api/admin/produtos/77').flush({ ...produtoCriado, id: 77 });
    http.expectOne('/api/categorias').flush(categorias);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).not.toContain('Produto cadastrado com sucesso.');
    expect(harness.routeNativeElement?.textContent).toContain('Editar produto');
    expect(harness.routeNativeElement?.textContent).toContain('Imagens do produto');
  });

  it('exibe mensagem geral e mensagens de campos devolvidas no erro 400', async () => {
    const pagina = await abrir();
    preencherValido();
    componente().cadastrar();
    http.expectOne('/api/admin/produtos').flush(
      {
        mensagem: 'Existem campos inválidos.',
        campos: { nome: 'Nome já utilizado.', preco: 'Preço fora do limite.' },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await pagina.fixture.whenStable();
    pagina.detectChanges();

    expect(pagina.routeNativeElement?.textContent).toContain('Existem campos inválidos.');
    expect(pagina.routeNativeElement?.textContent).toContain('Nome já utilizado.');
    expect(pagina.routeNativeElement?.textContent).toContain('Preço fora do limite.');
    expect(componente().formulario.getRawValue()).toEqual({
      nome: 'Teclado compacto',
      descricao: 'Teclado mecânico',
      preco: 249.9,
      precoAnterior: null,
      estoque: 0,
      categoriaId: 4,
      ativo: true,
    });
  });

  it('apresenta mensagem específica para nome duplicado no erro 409', async () => {
    const pagina = await abrir();
    preencherValido();
    componente().cadastrar();
    http.expectOne('/api/admin/produtos').flush(
      { mensagem: 'Conflito.' },
      { status: 409, statusText: 'Conflict' },
    );
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.textContent).toContain(
      'Já existe um produto cadastrado com este nome.',
    );
  });

  it('impede envios simultâneos', async () => {
    await abrir();
    preencherValido();
    componente().cadastrar();
    componente().cadastrar();
    const requisicao = http.expectOne('/api/admin/produtos');
    expect(requisicao.request.method).toBe('POST');
    http.expectNone('/api/admin/produtos');
    requisicao.flush(produtoCriado);
  });

  it('envia ativo falso quando o checkbox está desmarcado', async () => {
    await abrir();
    preencherValido();
    componente().formulario.controls.ativo.setValue(false);
    componente().cadastrar();
    const requisicao = http.expectOne('/api/admin/produtos');
    expect(requisicao.request.body.ativo).toBe(false);
    requisicao.flush(produtoCriado);
  });

  it('preserva os dados e mostra mensagem adequada após erro 500', async () => {
    const pagina = await abrir();
    preencherValido();
    componente().cadastrar();
    http.expectOne('/api/admin/produtos').flush(
      { mensagem: 'O serviço de produtos está temporariamente indisponível.' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    await pagina.fixture.whenStable();
    pagina.detectChanges();

    expect(pagina.routeNativeElement?.textContent).toContain(
      'O serviço de produtos está temporariamente indisponível.',
    );
    expect(componente().formulario.getRawValue()).toEqual({
      nome: 'Teclado compacto',
      descricao: 'Teclado mecânico',
      preco: 249.9,
      precoAnterior: null,
      estoque: 0,
      categoriaId: 4,
      ativo: true,
    });
  });

  it('protege a saída com alterações não salvas', async () => {
    const pagina = await abrir();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    componente().formulario.controls.nome.setValue('Rascunho');
    componente().formulario.controls.nome.markAsDirty();

    const navegou = await router.navigateByUrl('/admin/produtos');
    expect(confirmar).toHaveBeenCalled();
    expect(navegou).toBe(false);
    expect(router.url).toBe('/admin/produtos/novo');
    expect(pagina.routeNativeElement?.textContent).toContain('Novo produto');
    confirmar.mockRestore();
  });

  it('permite sair após o cadastro concluído', async () => {
    const pagina = await abrir();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    preencherValido();
    componente().cadastrar();
    http.expectOne('/api/admin/produtos').flush(produtoCriado);
    await vi.waitFor(() => expect(router.url).toBe('/admin/produtos/51'));
    http.expectOne('/api/admin/produtos/51').flush(produtoCriado);
    await pagina.fixture.whenStable();

    expect(router.url).toBe('/admin/produtos/51');
    expect(confirmar).not.toHaveBeenCalled();
    expect(pagina.routeNativeElement?.textContent).toContain('Produto cadastrado com sucesso.');
    confirmar.mockRestore();
  });
});
