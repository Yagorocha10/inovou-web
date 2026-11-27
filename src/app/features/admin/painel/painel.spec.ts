import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLocalePtBr } from '../../../core/locale';
import { ResumoAdmin } from '../../../core/models/admin';
import { Painel } from './painel';

@Component({ template: '<p>Destino de teste</p>' })
class DestinoAdminTeste {}

const resumoBase: ResumoAdmin = {
  pedidosHoje: 7,
  faturamentoHoje: 1234.56,
  pedidosParaPreparar: 3,
  produtosSemEstoque: 2,
  ultimosPedidos: [
    {
      id: 41,
      codigo: 'PED-2025-0041',
      status: 'PAGO',
      criadoEm: '2025-04-08T14:25:00.000Z',
      cliente: { id: 8, nome: 'Ana Souza', email: 'ana@example.com' },
      formaPagamento: 'PIX',
      quantidadeItens: 2,
      total: 189.9,
    },
  ],
};

describe('Painel administrativo', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Painel, DestinoAdminTeste],
      providers: [
        provideRouter([
          { path: 'admin', pathMatch: 'full', component: Painel },
          { path: 'admin/pedidos', component: DestinoAdminTeste },
          { path: 'admin/pedidos/:id', component: DestinoAdminTeste },
          { path: 'admin/produtos', component: DestinoAdminTeste },
          { path: 'admin/produtos/novo', component: DestinoAdminTeste },
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

  async function abrir(dados: ResumoAdmin = resumoBase): Promise<RouterTestingHarness> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin', Painel);
    http.expectOne('/api/admin/resumo').flush(dados);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness;
  }

  it('solicita o resumo no endpoint administrativo', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin', Painel);
    const requisicao = http.expectOne('/api/admin/resumo');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(resumoBase);
    await harness.fixture.whenStable();
  });

  it('exibe os quatro indicadores fornecidos pelo resumo', async () => {
    const pagina = await abrir();
    const texto = pagina.routeNativeElement?.textContent ?? '';
    expect(texto).toContain('Pedidos hoje');
    expect(texto).toContain('7');
    expect(texto).toContain('Faturamento hoje');
    expect(texto).toContain('Pedidos para preparar');
    expect(texto).toContain('3');
    expect(texto).toContain('Produtos sem estoque');
    expect(texto).toContain('2');
  });

  it('formata o faturamento em reais', async () => {
    const pagina = await abrir();
    expect(pagina.routeNativeElement?.textContent).toContain('R$ 1.234,56');
  });

  it('lista código, cliente, data, status e total dos pedidos recentes', async () => {
    const pagina = await abrir();
    const texto = pagina.routeNativeElement?.textContent ?? '';
    expect(texto).toContain('PED-2025-0041');
    expect(texto).toContain('Ana Souza');
    expect(texto).toContain('08/04/2025');
    expect(texto).toContain('Pago');
    expect(texto).toContain('R$ 189,90');
  });

  it('navega para os detalhes de um pedido', async () => {
    const pagina = await abrir();
    const linkDetalhes = pagina.routeNativeElement?.querySelector(
      'a[href="/admin/pedidos/41"]',
    ) as HTMLAnchorElement;
    expect(linkDetalhes).toBeTruthy();
    linkDetalhes.click();
    await pagina.fixture.whenStable();
    expect(router.url).toBe('/admin/pedidos/41');
  });

  it('navega para a listagem completa de pedidos', async () => {
    const pagina = await abrir();
    const linkTodos = pagina.routeNativeElement?.querySelector(
      'a[href="/admin/pedidos"]',
    ) as HTMLAnchorElement;
    linkTodos.click();
    await pagina.fixture.whenStable();
    expect(router.url).toBe('/admin/pedidos');
  });

  it('oferece atalhos para produtos, cadastro e pedidos', async () => {
    const pagina = await abrir();
    const links = Array.from(pagina.routeNativeElement?.querySelectorAll('.atalhos a') ?? []).map(
      (link) => link.getAttribute('href'),
    );
    expect(links).toEqual(['/admin/produtos', '/admin/produtos/novo', '/admin/pedidos']);
  });

  it('exibe carregamento enquanto o resumo está pendente', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin', Painel);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Carregando os indicadores...');
    http.expectOne('/api/admin/resumo').flush(resumoBase);
    await harness.fixture.whenStable();
  });

  it('apresenta mensagem da API e permite tentar novamente após falha', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin', Painel);
    http.expectOne('/api/admin/resumo').flush(
      { mensagem: 'Resumo temporariamente indisponível.' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Resumo temporariamente indisponível.');

    (harness.routeNativeElement?.querySelector('button') as HTMLButtonElement).click();
    harness.detectChanges();
    http.expectOne('/api/admin/resumo').flush(resumoBase);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Pedidos hoje');
  });

  it('mantém os indicadores e mostra estado sem pedidos recentes', async () => {
    const pagina = await abrir({ ...resumoBase, ultimosPedidos: [] });
    const texto = pagina.routeNativeElement?.textContent ?? '';
    expect(texto).toContain('7');
    expect(texto).toContain('R$ 1.234,56');
    expect(texto).toContain('Nenhum pedido recente.');
    expect(texto).not.toContain('PED-2025-0041');
  });
});
