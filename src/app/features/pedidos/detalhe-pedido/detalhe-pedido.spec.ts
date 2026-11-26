import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { provideLocalePtBr } from '../../../core/locale';
import { Pedido } from '../../../core/models/pedido';
import { PedidoService } from '../../../core/services/pedido.service';
import { DetalhePedido } from './detalhe-pedido';

const pedidoBase: Pedido = {
  id: 74,
  codigo: 'INV-000074',
  status: 'AGUARDANDO_PAGAMENTO',
  criadoEm: '2026-11-20T13:45:00',
  itens: [
    {
      produtoId: 12,
      nome: 'Monitor de Referência',
      slug: 'monitor-referencia',
      imagem: 'https://example.test/monitor.png',
      precoUnitario: 450,
      quantidade: 2,
      subtotal: 900,
    },
  ],
  subtotal: 900,
  frete: 25,
  total: 925,
  endereco: {
    cep: '66010-000',
    logradouro: 'Rua das Acácias',
    numero: '90',
    complemento: 'Casa 3',
    bairro: 'Centro',
    cidade: 'Belém',
    uf: 'PA',
  },
  pagamento: {
    forma: 'PIX',
    instrucoes: 'Pague usando o código Pix retornado no pedido.',
    codigoPix: 'PIX-CODIGO-API-74',
  },
  podeCancelar: true,
};

describe('DetalhePedido', () => {
  let fixture: ComponentFixture<DetalhePedido>;
  let pedidoService: {
    buscar: ReturnType<typeof vi.fn>;
    cancelar: ReturnType<typeof vi.fn>;
  };

  async function montar(resposta: Observable<Pedido> | Subject<Pedido>, id = '74') {
    pedidoService.buscar.mockReturnValue(resposta);
    fixture = TestBed.createComponent(DetalhePedido);
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    TestBed.tick();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  async function estabilizar(): Promise<void> {
    fixture.detectChanges();
    TestBed.tick();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function confirmar(valor: boolean): ReturnType<typeof vi.fn> {
    const confirmacao = vi.fn(() => valor);
    vi.stubGlobal('confirm', confirmacao);
    return confirmacao;
  }

  beforeEach(async () => {
    pedidoService = { buscar: vi.fn(), cancelar: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [DetalhePedido],
      providers: [
        provideRouter([]),
        provideLocalePtBr(),
        { provide: PedidoService, useValue: pedidoService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('busca o pedido usando o ID recebido pela rota', async () => {
    await montar(of(pedidoBase), '74');
    expect(pedidoService.buscar).toHaveBeenCalledExactlyOnceWith(74);
  });

  it('exibe os dados completos retornados pela API', async () => {
    await montar(of(pedidoBase));
    const html = fixture.nativeElement.textContent as string;
    expect(html).toContain('INV-000074');
    expect(html).toContain('Aguardando pagamento');
    expect(html).toContain('Monitor de Referência');
    expect(html).toContain('450,00');
    expect(html).toContain('Quantidade: 2');
    expect(html).toContain('900,00');
    expect(html).toContain('25,00');
    expect(html).toContain('925,00');
    expect(html).toContain('Rua das Acácias');
    expect(html).toContain('Pague usando o código Pix retornado no pedido.');
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.test/monitor.png',
    );
  });

  it('exibe código Pix apenas quando a forma é Pix e há código na resposta', async () => {
    await montar(of(pedidoBase));
    expect(fixture.nativeElement.textContent).toContain('PIX-CODIGO-API-74');

    fixture.destroy();
    await montar(of({ ...pedidoBase, pagamento: { ...pedidoBase.pagamento, codigoPix: null } }));
    expect(fixture.nativeElement.querySelector('.codigo-pix')).toBeNull();

    fixture.destroy();
    await montar(
      of({ ...pedidoBase, pagamento: { ...pedidoBase.pagamento, forma: 'CARTAO', codigoPix: 'NAO-EXIBIR' } }),
    );
    expect(fixture.nativeElement.textContent).not.toContain('NAO-EXIBIR');
  });

  it('mostra a ação de cancelar somente quando podeCancelar é verdadeiro', async () => {
    await montar(of(pedidoBase));
    expect(fixture.nativeElement.querySelector('button.botao--perigo')).not.toBeNull();

    fixture.destroy();
    await montar(of({ ...pedidoBase, podeCancelar: false }));
    expect(fixture.nativeElement.querySelector('button.botao--perigo')).toBeNull();
  });

  it('pede confirmação antes de chamar o cancelamento', async () => {
    await montar(of(pedidoBase));
    const confirmacao = confirmar(false);
    (fixture.nativeElement.querySelector('button.botao--perigo') as HTMLButtonElement).click();
    expect(confirmacao).toHaveBeenCalledOnce();
    expect(confirmacao).toHaveBeenCalledWith('Deseja cancelar o pedido INV-000074?');
    expect(pedidoService.cancelar).not.toHaveBeenCalled();
  });

  it('chama cancelar com o ID da rota após confirmação', async () => {
    await montar(of(pedidoBase));
    confirmar(true);
    pedidoService.cancelar.mockReturnValue(of(pedidoBase));
    (fixture.nativeElement.querySelector('button.botao--perigo') as HTMLButtonElement).click();
    await estabilizar();
    expect(pedidoService.cancelar).toHaveBeenCalledExactlyOnceWith(74);
  });

  it('impede envios duplicados e informa que o cancelamento está em andamento', async () => {
    await montar(of(pedidoBase));
    confirmar(true);
    const resposta = new Subject<Pedido>();
    pedidoService.cancelar.mockReturnValue(resposta);
    pedidoService.buscar.mockReturnValue(of({ ...pedidoBase, status: 'CANCELADO', podeCancelar: false }));
    const botao = fixture.nativeElement.querySelector('button.botao--perigo') as HTMLButtonElement;
    botao.click();
    fixture.detectChanges();
    expect(botao.disabled).toBe(true);
    expect(botao.textContent).toContain('Processando cancelamento');
    botao.click();
    expect(pedidoService.cancelar).toHaveBeenCalledTimes(1);
    resposta.next({ ...pedidoBase, status: 'CANCELADO', podeCancelar: false });
    resposta.complete();
    await estabilizar();
  });

  it('busca novamente o pedido após cancelamento bem-sucedido', async () => {
    const cancelado: Pedido = { ...pedidoBase, status: 'CANCELADO', podeCancelar: false };
    pedidoService.buscar.mockReturnValueOnce(of(pedidoBase)).mockReturnValueOnce(of(cancelado));
    pedidoService.cancelar.mockReturnValue(of(cancelado));
    await montar(of(pedidoBase));
    confirmar(true);
    (fixture.nativeElement.querySelector('button.botao--perigo') as HTMLButtonElement).click();
    await estabilizar();
    expect(pedidoService.buscar).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('A API confirmou o cancelamento do pedido.');
    expect(fixture.nativeElement.textContent).toContain('Cancelado');
    expect(fixture.nativeElement.querySelector('button.botao--perigo')).toBeNull();
  });

  it('trata HTTP 409 sem assumir que o pedido foi cancelado', async () => {
    await montar(of(pedidoBase));
    confirmar(true);
    pedidoService.cancelar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { mensagem: 'O status do pedido mudou.' } })),
    );
    (fixture.nativeElement.querySelector('button.botao--perigo') as HTMLButtonElement).click();
    await estabilizar();
    expect(fixture.nativeElement.textContent).toContain('O status do pedido mudou.');
    expect(fixture.nativeElement.textContent).not.toContain('A API confirmou o cancelamento do pedido.');
    expect(fixture.nativeElement.textContent).toContain('Aguardando pagamento');
    expect(pedidoService.buscar).toHaveBeenCalledTimes(1);
  });

  it('mostra mensagem genérica para pedido não encontrado', async () => {
    await montar(throwError(() => new HttpErrorResponse({ status: 404 })));
    expect(fixture.nativeElement.textContent).toContain('Não foi possível localizar este pedido.');
    expect(fixture.nativeElement.textContent).toContain('Voltar para meus pedidos');
  });

  it('mantém os dados exibidos se o cancelamento falhar', async () => {
    await montar(of(pedidoBase));
    confirmar(true);
    pedidoService.cancelar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: { mensagem: 'Falha temporária.' } })),
    );
    (fixture.nativeElement.querySelector('button.botao--perigo') as HTMLButtonElement).click();
    await estabilizar();
    expect(fixture.nativeElement.textContent).toContain('Falha temporária.');
    expect(fixture.nativeElement.textContent).toContain('INV-000074');
    expect(fixture.nativeElement.textContent).toContain('Monitor de Referência');
    expect(pedidoService.buscar).toHaveBeenCalledTimes(1);
  });

  it('apresenta estado de carregamento e oferece link de volta para pedidos', async () => {
    const resposta = new Subject<Pedido>();
    pedidoService.buscar.mockReturnValue(resposta);
    fixture = TestBed.createComponent(DetalhePedido);
    fixture.componentRef.setInput('id', '74');
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carregando os dados do pedido');
    resposta.next(pedidoBase);
    resposta.complete();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/pedidos"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/produtos"]')).not.toBeNull();
  });
});
