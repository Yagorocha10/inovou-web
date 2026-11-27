import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLocalePtBr } from '../../../core/locale';
import { PedidoAdmin } from '../../../core/models/admin';
import { DetalhePedidoAdmin } from './detalhe-pedido-admin';

@Component({ template: '<p>Lista de pedidos</p>' })
class ListaPedidosAdminTeste {}

const pedidoBase: PedidoAdmin = {
  id: 62,
  codigo: 'PED-2025-0062',
  status: 'PAGO',
  criadoEm: '2025-04-08T14:25:00.000Z',
  cliente: { id: 12, nome: 'João Almeida', email: 'joao@example.com' },
  itens: [
    {
      produtoId: 5,
      nome: 'Camiseta azul',
      slug: 'camiseta-azul',
      imagem: '/uploads/camiseta.png',
      precoUnitario: 49.95,
      quantidade: 2,
      subtotal: 99.9,
    },
  ],
  subtotal: 99.9,
  frete: 15,
  total: 114.9,
  endereco: {
    cep: '01001-000',
    logradouro: 'Praça da Sé',
    numero: '10',
    complemento: 'Apto 2',
    bairro: 'Sé',
    cidade: 'São Paulo',
    uf: 'SP',
  },
  pagamento: { forma: 'PIX', instrucoes: 'Aguardando pagamento', codigoPix: 'pix-codigo' },
  podeCancelar: false,
  proximosStatus: ['EM_SEPARACAO', 'CANCELADO'],
};

describe('DetalhePedidoAdmin', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalhePedidoAdmin, ListaPedidosAdminTeste],
      providers: [
        provideRouter([
          { path: 'admin/pedidos/:id', component: DetalhePedidoAdmin },
          { path: 'admin/pedidos', component: ListaPedidosAdminTeste },
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

  async function abrir(pedido = pedidoBase): Promise<RouterTestingHarness> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/admin/pedidos/${pedido.id}`, DetalhePedidoAdmin);
    http.expectOne(`/api/admin/pedidos/${pedido.id}`).flush(pedido);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness;
  }

  function componente(): any {
    return harness.routeDebugElement?.componentInstance as any;
  }

  it('carrega os dados do cliente, endereço, itens, pagamento e resumo formatado', async () => {
    const pagina = await abrir();
    const texto = pagina.routeNativeElement?.textContent ?? '';
    expect(texto).toContain('PED-2025-0062');
    expect(texto).toContain('08/04/2025');
    expect(texto).toContain('Pago');
    expect(texto).toContain('João Almeida');
    expect(texto).toContain('joao@example.com');
    expect(texto).toContain('Praça da Sé');
    expect(texto).toContain('Apto 2');
    expect(texto).toContain('01001-000');
    expect(texto).toContain('Camiseta azul');
    expect(texto).toContain('Aguardando pagamento');
    expect(texto).toContain('R$ 49,95');
    expect(texto).toContain('R$ 99,90');
    expect(texto).toContain('R$ 15,00');
    expect(texto).toContain('R$ 114,90');
    expect(pagina.routeNativeElement?.querySelector('a[href="/admin/pedidos"]')?.textContent).toContain('Voltar para pedidos');
  });

  it('exibe estado de pedido não encontrado para HTTP 404', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/pedidos/404', DetalhePedidoAdmin);
    http.expectOne('/api/admin/pedidos/404').flush(
      { mensagem: 'Pedido não encontrado.' },
      { status: 404, statusText: 'Not Found' },
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Pedido não encontrado.');
  });

  it('apresenta erro de carregamento e permite tentar novamente', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/pedidos/62', DetalhePedidoAdmin);
    http.expectOne('/api/admin/pedidos/62').flush(
      { mensagem: 'Falha ao consultar o pedido.' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Falha ao consultar o pedido.');

    (harness.routeNativeElement?.querySelector('button') as HTMLButtonElement).click();
    harness.detectChanges();
    http.expectOne('/api/admin/pedidos/62').flush(pedidoBase);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('PED-2025-0062');
  });

  it('mostra somente status e cancelamento oferecidos por proximosStatus', async () => {
    const pagina = await abrir({ ...pedidoBase, proximosStatus: ['ENTREGUE'] });
    const botoes = Array.from(pagina.routeNativeElement?.querySelectorAll('.acoes-status button') ?? [])
      .map((botao) => botao.textContent?.trim());
    expect(botoes).toEqual(['Marcar como Entregue']);
    expect(pagina.routeNativeElement?.textContent).not.toContain('Cancelar pedido');
    expect(pagina.routeNativeElement?.textContent).not.toContain('Marcar como Em separação');
  });

  it('envia o status permitido no PATCH e atualiza a tela com a resposta', async () => {
    const pagina = await abrir();
    (pagina.routeNativeElement?.querySelector('.acoes-status button') as HTMLButtonElement).click();
    const requisicao = http.expectOne('/api/admin/pedidos/62/status');
    expect(requisicao.request.method).toBe('PATCH');
    expect(requisicao.request.body).toEqual({ status: 'EM_SEPARACAO' });
    const atualizado: PedidoAdmin = {
      ...pedidoBase,
      status: 'EM_SEPARACAO',
      proximosStatus: ['SAIU_PARA_ENTREGA', 'CANCELADO'],
    };
    requisicao.flush(atualizado);
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.textContent).toContain('Status atualizado para Em separação.');
    expect(pagina.routeNativeElement?.querySelector('.status')?.textContent).toContain('Em separação');
    const botoesStatus = pagina.routeNativeElement?.querySelectorAll('.acoes-status button') ?? [];
    expect(botoesStatus.length).toBe(2);
    expect(Array.from(botoesStatus).map((botao) => botao.textContent?.trim())).toEqual([
      'Marcar como Saiu para entrega',
      'Cancelar pedido',
    ]);
  });

  it('impede duas atualizações simultâneas', async () => {
    await abrir();
    componente().atualizarStatus('EM_SEPARACAO');
    componente().atualizarStatus('EM_SEPARACAO');
    const requisicao = http.expectOne('/api/admin/pedidos/62/status');
    expect(requisicao.request.body).toEqual({ status: 'EM_SEPARACAO' });
    http.expectNone('/api/admin/pedidos/62/status');
    requisicao.flush({ ...pedidoBase, status: 'EM_SEPARACAO' });
  });

  it('confirma cancelamento e envia CANCELADO pelo endpoint de status', async () => {
    const pagina = await abrir();
    const confirmar = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    const botao = Array.from(pagina.routeNativeElement?.querySelectorAll('button') ?? []).find(
      (item) => item.textContent?.includes('Cancelar pedido'),
    ) as HTMLButtonElement;
    botao.click();
    const requisicao = http.expectOne('/api/admin/pedidos/62/status');
    expect(confirmar).toHaveBeenCalledWith('Deseja cancelar o pedido PED-2025-0062?');
    expect(requisicao.request.body).toEqual({ status: 'CANCELADO' });
    const cancelado: PedidoAdmin = { ...pedidoBase, status: 'CANCELADO', proximosStatus: [] };
    requisicao.flush(cancelado);
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.textContent).toContain('O pedido foi cancelado.');
    expect(pagina.routeNativeElement?.querySelector('.status')?.textContent).toContain('Cancelado');
    expect(pagina.routeNativeElement?.textContent).not.toContain('Cancelar pedido');
    confirmar.mockRestore();
  });

  it('não envia cancelamento quando a confirmação é recusada', async () => {
    const pagina = await abrir();
    const confirmar = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
    const cancelar = Array.from(pagina.routeNativeElement?.querySelectorAll('button') ?? []).find(
      (item) => item.textContent?.includes('Cancelar pedido'),
    ) as HTMLButtonElement;
    cancelar.click();
    expect(confirmar).toHaveBeenCalled();
    http.expectNone('/api/admin/pedidos/62/status');
    confirmar.mockRestore();
  });

  it('não envia cancelamento se CANCELADO não estiver em proximosStatus', async () => {
    const pagina = await abrir({ ...pedidoBase, proximosStatus: ['EM_SEPARACAO'] });
    expect(pagina.routeNativeElement?.textContent).not.toContain('Cancelar pedido');
    componente().atualizarStatus('CANCELADO');
    http.expectNone('/api/admin/pedidos/62/status');
  });

  it('em HTTP 409 informa conflito e recarrega o pedido', async () => {
    const pagina = await abrir();
    (pagina.routeNativeElement?.querySelector('.acoes-status button') as HTMLButtonElement).click();
    http.expectOne('/api/admin/pedidos/62/status').flush(
      { mensagem: 'Conflito de status.' },
      { status: 409, statusText: 'Conflict' },
    );
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.textContent).toContain('O pedido mudou no servidor.');

    const atualizado: PedidoAdmin = {
      ...pedidoBase,
      status: 'EM_SEPARACAO',
      proximosStatus: ['SAIU_PARA_ENTREGA'],
    };
    http.expectOne('/api/admin/pedidos/62').flush(atualizado);
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.querySelector('.status')?.textContent).toContain('Em separação');
    expect(pagina.routeNativeElement?.textContent).toContain('Saiu para entrega');
  });

  it('oculta dados antigos e permite nova tentativa se a recarga após 409 falhar', async () => {
    const pagina = await abrir();
    (pagina.routeNativeElement?.querySelector('.acoes-status button') as HTMLButtonElement).click();
    http.expectOne('/api/admin/pedidos/62/status').flush(
      { mensagem: 'O status mudou em outra sessão.' },
      { status: 409, statusText: 'Conflict' },
    );
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.textContent).toContain('O pedido mudou no servidor.');

    http.expectOne('/api/admin/pedidos/62').flush(
      { mensagem: 'Não foi possível consultar o estado atual.' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.textContent).toContain('Não foi possível atualizar os dados do pedido.');
    expect(pagina.routeNativeElement?.textContent).toContain('Não foi possível consultar o estado atual.');
    expect(pagina.routeNativeElement?.textContent).not.toContain('PED-2025-0062');
    expect(pagina.routeNativeElement?.textContent).not.toContain('João Almeida');

    (pagina.routeNativeElement?.querySelector('button') as HTMLButtonElement).click();
    http.expectOne('/api/admin/pedidos/62').flush({
      ...pedidoBase,
      status: 'EM_SEPARACAO',
      proximosStatus: ['SAIU_PARA_ENTREGA'],
    });
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.textContent).toContain('PED-2025-0062');
    expect(pagina.routeNativeElement?.querySelector('.status')?.textContent).toContain('Em separação');
  });

  it('preserva detalhes atuais e apresenta erro ao falhar a atualização', async () => {
    const pagina = await abrir();
    (pagina.routeNativeElement?.querySelector('.acoes-status button') as HTMLButtonElement).click();
    http.expectOne('/api/admin/pedidos/62/status').flush(
      { mensagem: 'Serviço de pedidos indisponível.' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    await pagina.fixture.whenStable();
    pagina.detectChanges();
    expect(pagina.routeNativeElement?.textContent).toContain('Serviço de pedidos indisponível.');
    expect(pagina.routeNativeElement?.querySelector('.status')?.textContent).toContain('Pago');
    expect(pagina.routeNativeElement?.textContent).toContain('João Almeida');
  });
});
