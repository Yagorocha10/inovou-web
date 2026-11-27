import { HttpEventType, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Categoria } from '../../../core/models/catalogo';
import { ProdutoAdmin } from '../../../core/models/admin';
import { alteracoesNaoSalvasGuard } from '../../../core/guards/alteracoes-nao-salvas.guard';
import { provideLocalePtBr } from '../../../core/locale';
import { EditarProdutoAdmin } from './editar-produto-admin';

@Component({ template: '<p>Outra tela administrativa</p>' })
class OutraTelaAdminTeste {}

const categorias: Categoria[] = [
  { id: 4, nome: 'Acessórios', slug: 'acessorios' },
  { id: 8, nome: 'Informática', slug: 'informatica' },
];

const produtoBase: ProdutoAdmin = {
  id: 31,
  nome: 'Teclado compacto',
  slug: 'teclado-compacto',
  descricao: 'Teclado mecânico',
  preco: 249.9,
  estoque: 5,
  ativo: true,
  categoria: categorias[0],
  imagens: [
    { id: 22, url: '/uploads/detalhe.png', ordem: 1 },
    { id: 21, url: '/uploads/principal.png', ordem: 0 },
  ],
};

describe('EditarProdutoAdmin', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarProdutoAdmin, OutraTelaAdminTeste],
      providers: [
        provideRouter([
          {
            path: 'admin/produtos/:id',
            component: EditarProdutoAdmin,
            canDeactivate: [alteracoesNaoSalvasGuard],
          },
          { path: 'admin/produtos', component: OutraTelaAdminTeste },
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

  async function abrir(produto = produtoBase): Promise<RouterTestingHarness> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/admin/produtos/${produto.id}`, EditarProdutoAdmin);
    http.expectOne(`/api/admin/produtos/${produto.id}`).flush(produto);
    http.expectOne('/api/categorias').flush(categorias);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness;
  }

  function componente(): any {
    return harness.routeDebugElement?.componentInstance as any;
  }

  function selecionarArquivos(...arquivos: File[]): void {
    componente().selecionarArquivos({ target: { files: arquivos, value: '' } } as unknown as Event);
    harness.detectChanges();
  }

  function arquivo(nome: string, tipo = 'image/png', conteudo = 'imagem'): File {
    return new File([conteudo], nome, { type: tipo });
  }

  it('carrega o produto e preenche os campos do formulário', async () => {
    const pagina = await abrir();
    const elemento = pagina.routeNativeElement as HTMLElement;

    expect((elemento.querySelector('[formControlName="nome"]') as HTMLInputElement).value).toBe('Teclado compacto');
    expect((elemento.querySelector('[formControlName="descricao"]') as HTMLTextAreaElement).value).toBe('Teclado mecânico');
    expect((elemento.querySelector('[formControlName="preco"]') as HTMLInputElement).value).toBe('249.9');
    expect((elemento.querySelector('[formControlName="estoque"]') as HTMLInputElement).value).toBe('5');
    expect(componente().formulario.controls.categoriaId.value).toBe(4);
    expect((elemento.querySelector('[formControlName="ativo"]') as HTMLInputElement).checked).toBe(true);
    expect(elemento.textContent).toContain('Editar produto');
  });

  it('exibe estado de produto inexistente para HTTP 404', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/produtos/404', EditarProdutoAdmin);
    http.expectOne('/api/admin/produtos/404').flush(
      { mensagem: 'Produto não encontrado.' },
      { status: 404, statusText: 'Not Found' },
    );
    http.expectOne('/api/categorias').flush(categorias);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Produto não encontrado.');
  });

  it('envia PUT com DadosProduto e aplica a resposta', async () => {
    const pagina = await abrir();
    componente().formulario.controls.nome.setValue('Teclado atualizado');
    componente().formulario.controls.preco.setValue(259.5);
    componente().formulario.controls.categoriaId.setValue(8);
    componente().formulario.controls.ativo.setValue(false);
    componente().salvar();

    const requisicao = http.expectOne('/api/admin/produtos/31');
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({
      nome: 'Teclado atualizado',
      descricao: 'Teclado mecânico',
      preco: 259.5,
      estoque: 5,
      categoriaId: 8,
      ativo: false,
    });
    const atualizado = {
      ...produtoBase,
      nome: 'Teclado atualizado',
      preco: 259.5,
      ativo: false,
      categoria: categorias[1],
    };
    requisicao.flush(atualizado);
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.textContent).toContain('Alterações salvas com sucesso.');
    expect(componente().formulario.pristine).toBe(true);
    expect(componente().produto().nome).toBe('Teclado atualizado');
  });

  it('não envia PUT se os valores voltaram ao estado original', async () => {
    await abrir();
    componente().formulario.controls.nome.setValue('Outro nome');
    componente().formulario.controls.nome.setValue(produtoBase.nome);
    componente().salvar();
    http.expectNone('/api/admin/produtos/31');
    expect(componente().feedback()).toBe('Nenhuma alteração para salvar.');
  });

  it('rejeita categoria inexistente no controle e bloqueia o PUT', async () => {
    await abrir();
    const controle = componente().formulario.controls.categoriaId;
    controle.setValue(999);
    expect(controle.hasError('categoriaInvalida')).toBe(true);
    componente().salvar();
    expect(controle.touched).toBe(true);
    http.expectNone('/api/admin/produtos/31');
  });

  it('mostra erros 400 por campo sem perder os valores do formulário', async () => {
    const pagina = await abrir();
    componente().formulario.controls.nome.setValue('Nome editado');
    componente().salvar();
    http.expectOne('/api/admin/produtos/31').flush(
      { mensagem: 'Revise os dados enviados.', campos: { nome: 'Nome indisponível.' } },
      { status: 400, statusText: 'Bad Request' },
    );
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.textContent).toContain('Revise os dados enviados.');
    expect(pagina.routeNativeElement?.textContent).toContain('Nome indisponível.');
    expect(componente().formulario.controls.nome.value).toBe('Nome editado');
  });

  it('mostra mensagem específica de conflito 409 e preserva os dados', async () => {
    const pagina = await abrir();
    componente().formulario.controls.nome.setValue('Nome duplicado');
    componente().salvar();
    http.expectOne('/api/admin/produtos/31').flush(
      { mensagem: 'Conflito.' },
      { status: 409, statusText: 'Conflict' },
    );
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.textContent).toContain('Já existe um produto cadastrado com este nome.');
    expect(componente().formulario.controls.nome.value).toBe('Nome duplicado');
  });

  it('protege a saída quando o formulário de edição tem alterações', async () => {
    const pagina = await abrir();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    componente().formulario.controls.nome.setValue('Rascunho editado');
    componente().formulario.controls.nome.markAsDirty();
    const navegou = await router.navigateByUrl('/admin/produtos');

    expect(confirmar).toHaveBeenCalled();
    expect(navegou).toBe(false);
    expect(router.url).toBe('/admin/produtos/31');
    expect(pagina.routeNativeElement?.textContent).toContain('Editar produto');
    confirmar.mockRestore();
  });

  it('mostra a galeria ordenada e destaca a imagem de ordem zero como principal', async () => {
    const pagina = await abrir();
    const imagens = pagina.routeNativeElement?.querySelectorAll('.imagem-card img');
    expect(imagens?.[0].getAttribute('src')).toBe('/uploads/principal.png');
    expect(pagina.routeNativeElement?.textContent).toContain('Principal');
  });

  it('valida formato, tamanho e máximo de oito imagens sem upload inválido', async () => {
    const pagina = await abrir();
    selecionarArquivos(arquivo('animacao.gif', 'image/gif'));
    expect(pagina.routeNativeElement?.textContent).toContain('Selecione arquivos JPG, PNG ou WEBP.');
    http.expectNone('/api/admin/produtos/31/imagens');

    const grande = arquivo('grande.png');
    Object.defineProperty(grande, 'size', { value: 5 * 1024 * 1024 + 1 });
    selecionarArquivos(grande);
    expect(pagina.routeNativeElement?.textContent).toContain('O arquivo ultrapassa o limite permitido de 5 MB.');
    http.expectNone('/api/admin/produtos/31/imagens');

    const produtoCheio: ProdutoAdmin = {
      ...produtoBase,
      imagens: Array.from({ length: 8 }, (_, ordem) => ({
        id: 100 + ordem,
        url: `/uploads/${ordem}.png`,
        ordem,
      })),
    };
    await router.navigateByUrl('/admin/produtos/32');
    pagina.detectChanges();
    http.expectOne('/api/admin/produtos/32').flush({ ...produtoCheio, id: 32 });
    await pagina.fixture.whenStable();
    selecionarArquivos(arquivo('nona.png'));
    expect(pagina.routeNativeElement?.textContent).toContain('Cada produto pode ter no máximo 8 imagens.');
    http.expectNone('/api/admin/produtos/32/imagens');
  });

  it('envia uploads em sequência, acompanha progresso e aplica o ProdutoAdmin retornado', async () => {
    const pagina = await abrir();
    selecionarArquivos(arquivo('uma.png'), arquivo('duas.webp', 'image/webp'));

    const primeira = http.expectOne('/api/admin/produtos/31/imagens');
    expect(primeira.request.method).toBe('POST');
    expect(primeira.request.body instanceof FormData).toBe(true);
    expect((primeira.request.body as FormData).get('arquivo')).toBeInstanceOf(File);
    expect(((primeira.request.body as FormData).get('arquivo') as File).name).toBe('uma.png');
    primeira.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 });
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.textContent).toContain('50%');
    const comUmaImagem = {
      ...produtoBase,
      imagens: [...produtoBase.imagens, { id: 23, url: '/uploads/uma.png', ordem: 2 }],
    };
    primeira.flush(comUmaImagem);

    const segunda = http.expectOne('/api/admin/produtos/31/imagens');
    expect(((segunda.request.body as FormData).get('arquivo') as File).name).toBe('duas.webp');
    const comDuasImagens = {
      ...comUmaImagem,
      imagens: [...comUmaImagem.imagens, { id: 24, url: '/uploads/duas.webp', ordem: 3 }],
    };
    segunda.flush(comDuasImagens);
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.querySelectorAll('.imagem-card').length).toBe(4);
    expect(componente().produto().imagens.at(-1).id).toBe(24);
  });

  it('mostra mensagem específica para HTTP 413 no upload', async () => {
    const pagina = await abrir();
    selecionarArquivos(arquivo('grande.png'));
    http.expectOne('/api/admin/produtos/31/imagens').flush(
      { mensagem: 'Payload Too Large.' },
      { status: 413, statusText: 'Payload Too Large' },
    );
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.textContent).toContain('O arquivo ultrapassa o limite permitido de 5 MB.');
  });

  it('remove imagem após confirmação e usa a resposta da API', async () => {
    const pagina = await abrir();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
    componente().removerImagem(produtoBase.imagens[0]);
    const requisicao = http.expectOne('/api/admin/produtos/31/imagens/22');
    expect(requisicao.request.method).toBe('DELETE');
    const atualizado = { ...produtoBase, imagens: [produtoBase.imagens[1]] };
    requisicao.flush(atualizado);
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(confirmar).toHaveBeenCalled();
    expect(pagina.routeNativeElement?.querySelectorAll('.imagem-card').length).toBe(1);
    expect(componente().produto().imagens[0].id).toBe(21);
    confirmar.mockRestore();
  });

  it('não remove imagem quando a confirmação é recusada', async () => {
    await abrir();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    componente().removerImagem(produtoBase.imagens[0]);
    expect(confirmar).toHaveBeenCalled();
    http.expectNone('/api/admin/produtos/31/imagens/22');
    confirmar.mockRestore();
  });

  it('ordena imagens por IDs e atualiza a galeria com a resposta da API', async () => {
    const pagina = await abrir();
    componente().moverImagem(1, -1);
    const requisicao = http.expectOne('/api/admin/produtos/31/imagens/ordem');
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({ ids: [22, 21] });
    const atualizado: ProdutoAdmin = {
      ...produtoBase,
      imagens: [
        { id: 22, url: '/uploads/detalhe.png', ordem: 0 },
        { id: 21, url: '/uploads/principal.png', ordem: 1 },
      ],
    };
    requisicao.flush(atualizado);
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.querySelector('.selo-principal')?.textContent).toContain('Principal');
    expect(pagina.routeNativeElement?.querySelector('.imagem-card img')?.getAttribute('src')).toBe('/uploads/detalhe.png');
    expect(componente().produto().imagens[0].id).toBe(22);
  });
});
