import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { provideLocalePtBr } from '../../../core/locale';
import { Carrinho } from '../../../core/models/carrinho';
import { DadosEndereco, Endereco } from '../../../core/models/auth';
import { Pedido, ResumoCheckout } from '../../../core/models/pedido';
import { CarrinhoService, StatusCarregamentoCarrinho } from '../../../core/services/carrinho.service';
import { ContaService } from '../../../core/services/conta.service';
import { PedidoService } from '../../../core/services/pedido.service';
import { CheckoutPagina } from './checkout-pagina';

const endereco: Endereco = {
  id: 7,
  cep: '66010-000',
  logradouro: 'Travessa Teste',
  numero: '100',
  complemento: null,
  bairro: 'Centro',
  cidade: 'Belém',
  uf: 'PA',
};

const outroEndereco: Endereco = {
  ...endereco,
  id: 8,
  cep: '67030-000',
  cidade: 'Ananindeua',
};

const carrinhoDisponivel: Carrinho = {
  itens: [
    {
      produtoId: 4,
      nome: 'Console portátil',
      slug: 'console-portatil',
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

const resumo: ResumoCheckout = {
  itens: [
    {
      produtoId: 4,
      nome: 'Console portátil',
      slug: 'console-portatil',
      imagem: null,
      precoUnitario: 40,
      quantidade: 2,
      subtotal: 80,
    },
  ],
  subtotal: 80,
  frete: 10,
  total: 90,
  prazoEntregaDias: 2,
  endereco: {
    cep: endereco.cep,
    logradouro: endereco.logradouro,
    numero: endereco.numero,
    complemento: endereco.complemento,
    bairro: endereco.bairro,
    cidade: endereco.cidade,
    uf: endereco.uf,
  },
};

const pedido: Pedido = {
  id: 123,
  codigo: 'INV-000123',
  status: 'AGUARDANDO_PAGAMENTO',
  criadoEm: '2026-11-25T10:00:00',
  itens: resumo.itens,
  subtotal: 80,
  frete: 10,
  total: 90,
  endereco: resumo.endereco,
  pagamento: { forma: 'PIX', instrucoes: 'Pague via Pix', codigoPix: 'PIX-SIMULADO' },
  podeCancelar: true,
};

describe('CheckoutPagina', () => {
  let fixture: ComponentFixture<CheckoutPagina>;
  let carrinhoAtual: ReturnType<typeof signal<Carrinho | null>>;
  let statusCarrinho: ReturnType<typeof signal<StatusCarregamentoCarrinho>>;
  let carrinhoStub: {
    carrinho: typeof carrinhoAtual;
    statusCarregamento: typeof statusCarrinho;
    carregar: ReturnType<typeof vi.fn>;
  };
  let contaStub: {
    enderecos: ReturnType<typeof vi.fn>;
    criarEndereco: ReturnType<typeof vi.fn>;
  };
  let pedidoStub: {
    resumoCheckout: ReturnType<typeof vi.fn>;
    criar: ReturnType<typeof vi.fn>;
  };
  let router: Router;
  let navegar: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    carrinhoAtual = signal(carrinhoDisponivel);
    statusCarrinho = signal<StatusCarregamentoCarrinho>('success');
    carrinhoStub = {
      carrinho: carrinhoAtual,
      statusCarregamento: statusCarrinho,
      carregar: vi.fn(),
    };
    contaStub = {
      enderecos: vi.fn(() => of([endereco])),
      criarEndereco: vi.fn(() => of(endereco)),
    };
    pedidoStub = {
      resumoCheckout: vi.fn(() => of(resumo)),
      criar: vi.fn(() => of(pedido)),
    };

    await TestBed.configureTestingModule({
      imports: [CheckoutPagina],
      providers: [
        provideRouter([]),
        provideLocalePtBr(),
        { provide: CarrinhoService, useValue: carrinhoStub },
        { provide: ContaService, useValue: contaStub },
        { provide: PedidoService, useValue: pedidoStub },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  function abrir(carrinho: Carrinho | null = carrinhoDisponivel): HTMLElement {
    carrinhoAtual.set(carrinho);
    fixture = TestBed.createComponent(CheckoutPagina);
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function selecionarEndereco(pagina: HTMLElement, id = endereco.id): void {
    const radio = pagina.querySelector(`input[name="enderecoId"][value="${id}"]`) as HTMLInputElement;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  }

  function continuarParaRevisao(pagina: HTMLElement): void {
    const botao = [...pagina.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Continuar para revisão'),
    ) as HTMLButtonElement;
    botao.click();
    fixture.detectChanges();
  }

  function irParaPagamento(pagina: HTMLElement): void {
    const botao = [...pagina.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Continuar para pagamento'),
    ) as HTMLButtonElement;
    botao.click();
    fixture.detectChanges();
  }

  function preencherEndereco(pagina: HTMLElement): void {
    const valores: Record<string, string> = {
      cep: '66010-000',
      logradouro: 'Travessa Teste',
      numero: '100',
      complemento: '',
      bairro: 'Centro',
      cidade: 'Belém',
    };
    for (const [campo, valor] of Object.entries(valores)) {
      const input = pagina.querySelector(`[formControlName="${campo}"]`) as HTMLInputElement;
      input.value = valor;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    fixture.detectChanges();
  }

  function irAtePagamento(pagina: HTMLElement): void {
    selecionarEndereco(pagina);
    continuarParaRevisao(pagina);
    irParaPagamento(pagina);
  }

  it('redireciona ao carrinho quando o carrinho está vazio', () => {
    abrir({ ...carrinhoDisponivel, itens: [], quantidadeTotal: 0, subtotal: 0, podeFinalizar: false });

    expect(navegar).toHaveBeenCalledWith('/carrinho');
  });

  it('redireciona ao carrinho quando há produto indisponível', () => {
    abrir({
      ...carrinhoDisponivel,
      itens: [{ ...carrinhoDisponivel.itens[0], disponivel: false }],
      podeFinalizar: false,
    });

    expect(navegar).toHaveBeenCalledWith('/carrinho');
  });

  it('bloqueia o resumo se o carrinho ainda não foi carregado', () => {
    const pagina = abrir(null);
    (fixture.componentInstance as unknown as { continuarParaResumo(): void }).continuarParaResumo();

    expect(pedidoStub.resumoCheckout).not.toHaveBeenCalled();
    expect(pagina.textContent).toContain('Indisponível');
  });

  it('bloqueia o resumo quando o carrinho está vazio', () => {
    abrir({ ...carrinhoDisponivel, itens: [], quantidadeTotal: 0, subtotal: 0, podeFinalizar: false });
    (fixture.componentInstance as unknown as { continuarParaResumo(): void }).continuarParaResumo();

    expect(pedidoStub.resumoCheckout).not.toHaveBeenCalled();
  });

  it('bloqueia o resumo quando o carrinho não pode ser finalizado', () => {
    abrir({ ...carrinhoDisponivel, podeFinalizar: false });
    (fixture.componentInstance as unknown as { continuarParaResumo(): void }).continuarParaResumo();

    expect(pedidoStub.resumoCheckout).not.toHaveBeenCalled();
  });

  it('mostra erro de carregamento do carrinho e permite tentar novamente', () => {
    carrinhoAtual.set(null);
    statusCarrinho.set('error');
    const pagina = abrir(null);

    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar seu carrinho');
    expect(navegar).not.toHaveBeenCalledWith('/carrinho');
    expect(pagina.textContent).toContain('Indisponível');
    const tentarNovamente = [...pagina.querySelectorAll('button')].find((botao) =>
      botao.textContent?.includes('Tentar carregar novamente'),
    ) as HTMLButtonElement;
    tentarNovamente.click();

    expect(carrinhoStub.carregar).toHaveBeenCalledOnce();
    expect(pagina.querySelector('#titulo-endereco')).not.toBeNull();
  });

  it('ignora a resposta antiga se o endereço mudar durante o resumo', () => {
    const respostaAntiga = new Subject<ResumoCheckout>();
    const respostaAtual = new Subject<ResumoCheckout>();
    const resumoOutroEndereco: ResumoCheckout = {
      ...resumo,
      endereco: { ...resumo.endereco, cep: outroEndereco.cep, cidade: outroEndereco.cidade },
      frete: 15,
      total: 95,
      prazoEntregaDias: 3,
    };
    pedidoStub.resumoCheckout
      .mockReturnValueOnce(respostaAntiga.asObservable())
      .mockReturnValueOnce(respostaAtual.asObservable());
    contaStub.enderecos.mockReturnValue(of([endereco, outroEndereco]));
    const paginaComEnderecos = abrir();

    selecionarEndereco(paginaComEnderecos, endereco.id);
    continuarParaRevisao(paginaComEnderecos);
    expect(paginaComEnderecos.querySelector('#titulo-revisao')).toBeNull();

    selecionarEndereco(paginaComEnderecos, outroEndereco.id);
    expect(paginaComEnderecos.querySelector('#titulo-revisao')).toBeNull();
    continuarParaRevisao(paginaComEnderecos);
    expect(paginaComEnderecos.textContent).toContain('Calculando frete...');

    respostaAntiga.next(resumo);
    fixture.detectChanges();
    expect(paginaComEnderecos.querySelector('#titulo-revisao')).toBeNull();
    expect(paginaComEnderecos.textContent).toContain('Calculando frete...');
    respostaAntiga.error(new HttpErrorResponse({ status: 400, error: { mensagem: 'Erro antigo' } }));
    fixture.detectChanges();
    expect(paginaComEnderecos.querySelector('[role="alert"]')?.textContent ?? '').not.toContain(
      'Erro antigo',
    );
    expect(paginaComEnderecos.textContent).toContain('Calculando frete...');

    respostaAtual.next(resumoOutroEndereco);
    fixture.detectChanges();
    expect(paginaComEnderecos.querySelector('#titulo-revisao')).not.toBeNull();
    const texto = paginaComEnderecos.textContent?.replace(/\u00a0/g, ' ');
    expect(texto).toContain(outroEndereco.cidade);
    expect(texto).toContain('R$ 15,00');
  });

  it('mantém Continuar desabilitado sem endereço selecionado', () => {
    const pagina = abrir();
    const botao = [...pagina.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Continuar para revisão'),
    ) as HTMLButtonElement;

    expect(botao.disabled).toBe(true);
  });

  it('permite cadastrar um endereço e prosseguir para revisão', () => {
    contaStub.enderecos.mockReturnValue(of([]));
    contaStub.criarEndereco.mockReturnValue(of(endereco));
    const pagina = abrir();
    preencherEndereco(pagina);
    (pagina.querySelector('.endereco-form button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(contaStub.criarEndereco).toHaveBeenCalledWith({
      cep: '66010-000',
      logradouro: 'Travessa Teste',
      numero: '100',
      complemento: null,
      bairro: 'Centro',
      cidade: 'Belém',
      uf: 'PA',
    } satisfies DadosEndereco);
    expect((pagina.querySelector('input[name="enderecoId"]') as HTMLInputElement).checked).toBe(true);
    continuarParaRevisao(pagina);
    expect(pedidoStub.resumoCheckout).toHaveBeenCalledWith(endereco.id);
    expect(pagina.querySelector('#titulo-revisao')).not.toBeNull();
  });

  it('carrega o resumo usando enderecoId e mostra os valores retornados', () => {
    const pagina = abrir();
    selecionarEndereco(pagina);
    continuarParaRevisao(pagina);

    expect(pedidoStub.resumoCheckout).toHaveBeenCalledWith(endereco.id);
    const texto = pagina.textContent?.replace(/\u00a0/g, ' ');
    expect(texto).toContain('Console portátil');
    expect(texto).toContain('Travessa Teste');
    expect(texto).toContain('R$ 10,00');
    expect(texto).toContain('2 dias');
    expect(texto).toContain('R$ 90,00');
  });

  it('mostra erro 400 de CEP e mantém o passo de endereço', () => {
    contaStub.enderecos.mockReturnValue(of([endereco, outroEndereco]));
    pedidoStub.resumoCheckout.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { mensagem: 'Ainda não entregamos no CEP informado.' } })),
    );
    const pagina = abrir();
    selecionarEndereco(pagina);
    continuarParaRevisao(pagina);

    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain('Ainda não entregamos no CEP informado.');
    expect(pagina.querySelector('#titulo-endereco')).not.toBeNull();
    expect(pagina.querySelector('#titulo-revisao')).toBeNull();
    selecionarEndereco(pagina, outroEndereco.id);
    expect((pagina.querySelector(`input[value="${outroEndereco.id}"]`) as HTMLInputElement).checked).toBe(true);
  });

  it('permite selecionar uma forma de pagamento', () => {
    const pagina = abrir();
    irAtePagamento(pagina);
    const radio = pagina.querySelector('input[name="formaPagamento"][value="NA_ENTREGA"]') as HTMLInputElement;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(radio.checked).toBe(true);
    expect(pagina.textContent).toContain('nenhuma cobrança real será realizada');
  });

  it('envia enderecoId e formaPagamento ao confirmar', () => {
    const pagina = abrir();
    irAtePagamento(pagina);
    (pagina.querySelector('.etapa-conteudo__acoes button.botao--primario') as HTMLButtonElement).click();

    expect(pedidoStub.criar).toHaveBeenCalledWith({ enderecoId: endereco.id, formaPagamento: 'PIX' });
  });

  it('desabilita o botão e impede envio duplicado enquanto confirma', () => {
    const envio = new Subject<Pedido>();
    pedidoStub.criar.mockReturnValue(envio);
    const pagina = abrir();
    irAtePagamento(pagina);
    const botao = pagina.querySelector('.etapa-conteudo__acoes button.botao--primario') as HTMLButtonElement;
    botao.click();
    fixture.detectChanges();

    expect(botao.disabled).toBe(true);
    expect(botao.textContent).toContain('Enviando...');
    botao.click();
    expect(pedidoStub.criar).toHaveBeenCalledTimes(1);
    envio.next(pedido);
    envio.complete();
  });

  it('recarrega o carrinho e navega para a confirmação após sucesso', async () => {
    const pagina = abrir();
    irAtePagamento(pagina);
    (pagina.querySelector('.etapa-conteudo__acoes button.botao--primario') as HTMLButtonElement).click();

    expect(navegar).toHaveBeenCalledWith('/pedidos/123/confirmado');
    await vi.waitFor(() => expect(carrinhoStub.carregar).toHaveBeenCalledOnce());
  });

  it('não volta para o carrinho quando ele esvazia logo depois do pedido', () => {
    const pagina = abrir();
    irAtePagamento(pagina);
    (pagina.querySelector('.etapa-conteudo__acoes button.botao--primario') as HTMLButtonElement).click();

    carrinhoAtual.set({ ...carrinhoDisponivel, itens: [], quantidadeTotal: 0, podeFinalizar: false });
    TestBed.tick();

    expect(navegar).toHaveBeenCalledWith('/pedidos/123/confirmado');
    expect(navegar).not.toHaveBeenCalledWith('/carrinho');
  });

  it('mostra conflito 409 e oferece voltar ao carrinho', () => {
    pedidoStub.criar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { mensagem: 'Estoque insuficiente.' } })),
    );
    const pagina = abrir();
    irAtePagamento(pagina);
    (pagina.querySelector('.etapa-conteudo__acoes button.botao--primario') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain('Estoque insuficiente.');
    const voltar = [...pagina.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Voltar ao carrinho'),
    ) as HTMLButtonElement;
    expect(voltar).toBeTruthy();
    expect(pagina.querySelector('#titulo-pagamento')).not.toBeNull();
    voltar.click();
    expect(navegar).toHaveBeenCalledWith('/carrinho');
  });
});
