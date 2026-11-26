import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { provideLocalePtBr } from '../../../core/locale';
import { Pedido } from '../../../core/models/pedido';
import { PedidoService } from '../../../core/services/pedido.service';
import { PedidoConfirmado } from './pedido-confirmado';

const pedidoBase: Pedido = {
  id: 42,
  codigo: 'INV-000042',
  status: 'AGUARDANDO_PAGAMENTO',
  criadoEm: '2026-11-25T10:30:00',
  itens: [
    {
      produtoId: 8,
      nome: 'Teclado Mecânico',
      slug: 'teclado-mecanico',
      imagem: 'https://example.test/teclado.png',
      precoUnitario: 150,
      quantidade: 2,
      subtotal: 300,
    },
  ],
  subtotal: 300,
  frete: 20,
  total: 320,
  endereco: {
    cep: '66010-000',
    logradouro: 'Rua das Flores',
    numero: '15',
    complemento: 'Apto 2',
    bairro: 'Centro',
    cidade: 'Belém',
    uf: 'PA',
  },
  pagamento: {
    forma: 'PIX',
    instrucoes: 'Use o código Pix para realizar o pagamento.',
    codigoPix: 'PIX-REAL-DA-API',
  },
  podeCancelar: true,
};

describe('PedidoConfirmado', () => {
  let fixture: ComponentFixture<PedidoConfirmado>;
  let pedidoService: { buscar: ReturnType<typeof vi.fn> };

  async function montar(resposta: Observable<Pedido> | Subject<Pedido>, id = '42') {
    pedidoService.buscar.mockReturnValue(resposta);
    fixture = TestBed.createComponent(PedidoConfirmado);
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    TestBed.tick();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    pedidoService = { buscar: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PedidoConfirmado],
      providers: [
        provideRouter([]),
        provideLocalePtBr(),
        { provide: PedidoService, useValue: pedidoService },
      ],
    }).compileComponents();
  });

  it('carrega o pedido pelo ID recebido na rota', async () => {
    await montar(of(pedidoBase), '42');
    expect(pedidoService.buscar).toHaveBeenCalledExactlyOnceWith(42);
  });

  it('exibe os dados retornados pela API', async () => {
    await montar(of(pedidoBase));
    const html = fixture.nativeElement.textContent as string;
    expect(html).toContain('INV-000042');
    expect(html).toContain('Aguardando pagamento');
    expect(html).toContain('Teclado Mecânico');
    expect(html).toContain('Quantidade: 2');
    expect(html).toContain('Rua das Flores');
    expect(html).toContain('Subtotal');
    expect(html).toContain('Frete');
    expect(html).toContain('Total');
    expect(html).toContain('Use o código Pix para realizar o pagamento.');
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.test/teclado.png',
    );
  });

  it('exibe o código Pix somente quando a API o retorna para pagamento Pix', async () => {
    await montar(of(pedidoBase));
    expect(fixture.nativeElement.textContent).toContain('PIX-REAL-DA-API');

    fixture.destroy();
    await montar(of({ ...pedidoBase, pagamento: { ...pedidoBase.pagamento, codigoPix: null } }));
    expect(fixture.nativeElement.textContent).not.toContain('PIX-REAL-DA-API');
    expect(fixture.nativeElement.querySelector('.codigo-pix')).toBeNull();
  });

  it.each([
    ['PIX', 'Instruções Pix retornadas pela API.', 'PIX', 'PIX-REAL-DA-API'],
    ['CARTAO', 'Instruções do cartão retornadas pela API.', 'CARTAO', null],
    ['NA_ENTREGA', 'Instruções de pagamento na entrega retornadas pela API.', 'NA_ENTREGA', null],
  ] as const)('exibe as instruções de %s retornadas pela API', async (_nome, instrucoes, forma, codigoPix) => {
    const pagamento = { forma, instrucoes, codigoPix } as Pedido['pagamento'];
    await montar(of({ ...pedidoBase, pagamento }));
    expect(fixture.nativeElement.textContent).toContain(instrucoes);
    if (forma === 'CARTAO') {
      expect(fixture.nativeElement.textContent).toContain('Nenhuma cobrança real foi realizada.');
    }
    if (forma !== 'PIX') {
      expect(fixture.nativeElement.querySelector('.codigo-pix')).toBeNull();
    }
  });

  it('apresenta estado de carregamento enquanto a requisição está pendente', async () => {
    const resposta = new Subject<Pedido>();
    pedidoService.buscar.mockReturnValue(resposta);
    fixture = TestBed.createComponent(PedidoConfirmado);
    fixture.componentRef.setInput('id', '42');
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carregando os dados do pedido');
    resposta.next(pedidoBase);
    resposta.complete();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('mostra mensagem genérica quando a API retorna 404', async () => {
    await montar(throwError(() => new HttpErrorResponse({ status: 404 })));
    expect(fixture.nativeElement.textContent).toContain('Não foi possível localizar este pedido.');
    expect(fixture.nativeElement.textContent).not.toContain('outro usuário');
  });

  it('oferece links para continuar comprando e acessar meus pedidos', async () => {
    await montar(of(pedidoBase));
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.some((link) => link.textContent?.includes('Continuar comprando') && link.getAttribute('href') === '/produtos')).toBe(true);
    expect(links.some((link) => link.textContent?.includes('Acessar meus pedidos') && link.getAttribute('href') === '/pedidos')).toBe(true);
  });

  it('não cria código nem instruções de pagamento que não vieram na resposta', async () => {
    const pagamento = { forma: 'PIX' as const, instrucoes: '', codigoPix: null };
    await montar(of({ ...pedidoBase, pagamento }));
    expect(fixture.nativeElement.querySelector('.codigo-pix')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pagamento__instrucoes')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('PIX-SIMULADO');
  });
});
