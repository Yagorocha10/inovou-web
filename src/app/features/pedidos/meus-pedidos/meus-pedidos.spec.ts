import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { provideLocalePtBr } from '../../../core/locale';
import { Pagina } from '../../../core/models/catalogo';
import { PedidoResumo } from '../../../core/models/pedido';
import { PedidoService } from '../../../core/services/pedido.service';
import { MeusPedidos } from './meus-pedidos';

const pedidoUm: PedidoResumo = {
  id: 31,
  codigo: 'INV-000031',
  status: 'AGUARDANDO_PAGAMENTO',
  criadoEm: '2026-11-20T13:45:00',
  quantidadeItens: 3,
  total: 245.5,
};

const pedidoDois: PedidoResumo = {
  id: 32,
  codigo: 'INV-000032',
  status: 'EM_SEPARACAO',
  criadoEm: '2026-11-21T08:15:00',
  quantidadeItens: 1,
  total: 80,
};

function pagina(
  itens: PedidoResumo[],
  atual = 0,
  totalItens = itens.length,
  totalPaginas = 1,
): Pagina<PedidoResumo> {
  return { itens, pagina: atual, tamanho: 10, totalItens, totalPaginas };
}

describe('MeusPedidos', () => {
  let fixture: ComponentFixture<MeusPedidos>;
  let pedidoService: { listar: ReturnType<typeof vi.fn> };

  async function montar(resposta: Observable<Pagina<PedidoResumo>> | Subject<Pagina<PedidoResumo>>) {
    pedidoService.listar.mockReturnValue(resposta);
    fixture = TestBed.createComponent(MeusPedidos);
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

  beforeEach(async () => {
    pedidoService = { listar: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [MeusPedidos],
      providers: [provideRouter([]), provideLocalePtBr(), { provide: PedidoService, useValue: pedidoService }],
    }).compileComponents();
  });

  it('carrega inicialmente a primeira página com tamanho 10', async () => {
    await montar(of(pagina([pedidoUm], 0, 1, 1)));
    expect(pedidoService.listar).toHaveBeenCalledExactlyOnceWith(0, 10);
  });

  it('exibe os pedidos retornados pela API', async () => {
    await montar(of(pagina([pedidoUm, pedidoDois], 0, 2, 1)));
    const html = fixture.nativeElement.textContent as string;
    expect(html).toContain('INV-000031');
    expect(html).toContain('INV-000032');
    expect(html).toContain('3 itens');
    expect(html).toContain('1 item');
    expect(html).toContain('245,50');
    expect(html).toContain('80,00');
    expect(fixture.nativeElement.querySelectorAll('.pedido-card').length).toBe(2);
  });

  it('apresenta rótulos amigáveis para os status retornados', async () => {
    await montar(of(pagina([pedidoUm, pedidoDois])));
    const html = fixture.nativeElement.textContent as string;
    expect(html).toContain('Aguardando pagamento');
    expect(html).toContain('Em separação');
  });

  it('avança para a página seguinte usando a paginação retornada pela API', async () => {
    pedidoService.listar.mockReturnValueOnce(of(pagina([pedidoUm], 0, 11, 2)));
    pedidoService.listar.mockReturnValueOnce(of(pagina([pedidoDois], 1, 11, 2)));
    fixture = TestBed.createComponent(MeusPedidos);
    fixture.detectChanges();
    TestBed.tick();
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button:last-child') as HTMLButtonElement).click();
    await estabilizar();

    expect(pedidoService.listar).toHaveBeenNthCalledWith(2, 1, 10);
    expect(fixture.nativeElement.textContent).toContain('Página 2 de 2');
    expect(fixture.nativeElement.textContent).toContain('INV-000032');
  });

  it('volta para a página anterior', async () => {
    pedidoService.listar.mockReturnValueOnce(of(pagina([pedidoUm], 0, 11, 2)));
    pedidoService.listar.mockReturnValueOnce(of(pagina([pedidoDois], 1, 11, 2)));
    pedidoService.listar.mockReturnValueOnce(of(pagina([pedidoUm], 0, 11, 2)));
    fixture = TestBed.createComponent(MeusPedidos);
    fixture.detectChanges();
    TestBed.tick();
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.paginacao button:last-child') as HTMLButtonElement).click();
    await estabilizar();
    (fixture.nativeElement.querySelector('.paginacao button:first-child') as HTMLButtonElement).click();
    await estabilizar();

    expect(pedidoService.listar).toHaveBeenNthCalledWith(3, 0, 10);
    expect(fixture.nativeElement.textContent).toContain('Página 1 de 2');
  });

  it('bloqueia navegação além do início e do fim', async () => {
    await montar(of(pagina([pedidoUm], 0, 11, 2)));
    const botoesIniciais = Array.from(fixture.nativeElement.querySelectorAll('.paginacao button')) as HTMLButtonElement[];
    expect(botoesIniciais[0].disabled).toBe(true);
    expect(botoesIniciais[1].disabled).toBe(false);

    fixture.destroy();
    await montar(of(pagina([pedidoDois], 1, 11, 2)));
    const botoesFinais = Array.from(fixture.nativeElement.querySelectorAll('.paginacao button')) as HTMLButtonElement[];
    expect(botoesFinais[0].disabled).toBe(false);
    expect(botoesFinais[1].disabled).toBe(true);
  });

  it('exibe estado vazio sem criar pedidos e oferece continuar comprando', async () => {
    await montar(of(pagina([], 0, 0, 0)));
    expect(fixture.nativeElement.textContent).toContain('Você ainda não tem pedidos.');
    expect(fixture.nativeElement.querySelector('.pedido-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/produtos"]')).not.toBeNull();
  });

  it('apresenta estado de carregamento enquanto a requisição está pendente', async () => {
    const resposta = new Subject<Pagina<PedidoResumo>>();
    pedidoService.listar.mockReturnValue(resposta);
    fixture = TestBed.createComponent(MeusPedidos);
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carregando seus pedidos');
    resposta.next(pagina([pedidoUm]));
    resposta.complete();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('trata falha e permite tentar novamente', async () => {
    pedidoService.listar.mockReturnValueOnce(throwError(() => new Error('falha')));
    pedidoService.listar.mockReturnValueOnce(of(pagina([pedidoUm])));
    fixture = TestBed.createComponent(MeusPedidos);
    fixture.detectChanges();
    TestBed.tick();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar seus pedidos.');

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    await estabilizar();
    expect(pedidoService.listar).toHaveBeenNthCalledWith(2, 0, 10);
    expect(fixture.nativeElement.textContent).toContain('INV-000031');
  });

  it('navega para os detalhes correspondentes ao ID do pedido', async () => {
    await montar(of(pagina([pedidoUm])));
    const link = fixture.nativeElement.querySelector('.pedido-card__acao') as HTMLAnchorElement;
    expect(link.textContent).toContain('Ver detalhes');
    expect(link.getAttribute('href')).toBe('/pedidos/31');
  });
});
