import { CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { camposComErro, mensagemDeErro } from '../../../core/erro-api';
import { DadosEndereco, Endereco, UFS } from '../../../core/models/auth';
import { FormaPagamento, NovoPedido, ResumoCheckout } from '../../../core/models/pedido';
import { CarrinhoService } from '../../../core/services/carrinho.service';
import { ContaService } from '../../../core/services/conta.service';
import { PedidoService } from '../../../core/services/pedido.service';

type CampoEndereco = keyof DadosEndereco;
type EtapaCheckout = 1 | 2 | 3;

@Component({
  selector: 'app-checkout-pagina',
  imports: [CurrencyPipe, ReactiveFormsModule],
  templateUrl: './checkout-pagina.html',
  styleUrl: './checkout-pagina.scss',
})
export class CheckoutPagina implements OnInit, OnDestroy {
  private readonly carrinhoService = inject(CarrinhoService);
  private readonly contaService = inject(ContaService);
  private readonly pedidoService = inject(PedidoService);
  private readonly router = inject(Router);

  protected readonly carrinho = this.carrinhoService.carrinho;
  protected readonly statusCarrinho = this.carrinhoService.statusCarregamento;
  protected readonly itens = computed(() => this.carrinho()?.itens ?? []);
  private readonly pedidoConcluido = signal(false);
  protected readonly ufs = UFS;
  protected readonly etapa = signal<EtapaCheckout>(1);
  protected readonly enderecos = signal<Endereco[]>([]);
  protected readonly carregandoEnderecos = signal(true);
  protected readonly erroEnderecos = signal<string | null>(null);
  protected readonly formularioAberto = signal(false);
  protected readonly enderecoSelecionadoId = signal<number | null>(null);
  protected readonly salvandoEndereco = signal(false);
  protected readonly errosServidor = signal<Record<string, string>>({});
  protected readonly erro = signal<string | null>(null);
  protected readonly carregandoResumo = signal(false);
  protected readonly resumo = signal<ResumoCheckout | null>(null);
  protected readonly formaPagamento = signal<FormaPagamento>('PIX');
  protected readonly enviando = signal(false);
  protected readonly erroPedido409 = signal(false);
  private sequenciaResumo = 0;
  private requisicaoResumo: Subscription | null = null;

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    cep: ['', [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)]],
    logradouro: ['', [Validators.required, Validators.maxLength(150)]],
    numero: ['', [Validators.required, Validators.maxLength(20)]],
    complemento: ['', Validators.maxLength(80)],
    bairro: ['', [Validators.required, Validators.maxLength(80)]],
    cidade: ['Belém', [Validators.required, Validators.maxLength(80)]],
    uf: ['PA', Validators.required],
  });

  constructor() {
    effect(() => {
      const carrinho = this.carrinho();
      if (
        !this.pedidoConcluido() &&
        this.statusCarrinho() === 'success' &&
        carrinho &&
        (!carrinho.itens.length || !carrinho.podeFinalizar)
      ) {
        void this.router.navigateByUrl('/carrinho');
      }
    });
  }

  ngOnInit(): void {
    this.carregarEnderecos();
  }

  ngOnDestroy(): void {
    this.invalidarResumoPendente();
  }

  protected carregarEnderecos(): void {
    this.carregandoEnderecos.set(true);
    this.erroEnderecos.set(null);
    this.contaService.enderecos().subscribe({
      next: (enderecos) => {
        this.enderecos.set(enderecos);
        this.carregandoEnderecos.set(false);
        if (enderecos.length === 0) {
          this.formularioAberto.set(true);
        }
      },
      error: (falha: unknown) => {
        this.carregandoEnderecos.set(false);
        this.erroEnderecos.set(mensagemDeErro(falha, 'Não foi possível carregar seus endereços.'));
      },
    });
  }

  protected selecionarEndereco(enderecoId: number): void {
    this.invalidarResumoPendente();
    this.enderecoSelecionadoId.set(enderecoId);
    this.resumo.set(null);
    this.erro.set(null);
  }

  protected continuarParaResumo(): void {
    const carrinho = this.carrinho();
    const enderecoId = this.enderecoSelecionadoId();
    if (
      !carrinho ||
      carrinho.itens.length === 0 ||
      !carrinho.podeFinalizar ||
      this.statusCarrinho() !== 'success' ||
      enderecoId === null ||
      this.carregandoResumo()
    ) {
      return;
    }

    this.invalidarResumoPendente();
    const sequencia = this.sequenciaResumo;
    this.erro.set(null);
    this.carregandoResumo.set(true);
    this.requisicaoResumo = this.pedidoService.resumoCheckout(enderecoId).subscribe({
      next: (resumo) => {
        if (!this.resumoAindaAtual(sequencia, enderecoId)) {
          return;
        }
        this.requisicaoResumo = null;
        this.resumo.set(resumo);
        this.etapa.set(2);
        this.carregandoResumo.set(false);
      },
      error: (falha: unknown) => {
        if (!this.resumoAindaAtual(sequencia, enderecoId)) {
          return;
        }
        this.requisicaoResumo = null;
        this.erro.set(mensagemDeErro(falha, 'Não foi possível calcular o resumo do checkout.'));
        this.carregandoResumo.set(false);
      },
    });
  }

  protected continuarParaPagamento(): void {
    if (this.resumo()) {
      this.erro.set(null);
      this.etapa.set(3);
    }
  }

  protected voltarParaEndereco(): void {
    this.invalidarResumoPendente();
    this.etapa.set(1);
    this.erro.set(null);
  }

  protected voltarParaRevisao(): void {
    if (this.resumo()) {
      this.erro.set(null);
      this.etapa.set(2);
    }
  }

  protected selecionarFormaPagamento(forma: FormaPagamento): void {
    this.formaPagamento.set(forma);
  }

  protected novoEndereco(): void {
    this.invalidarResumoPendente();
    this.resumo.set(null);
    this.formulario.reset();
    this.errosServidor.set({});
    this.erro.set(null);
    this.formularioAberto.set(true);
  }

  protected cancelarCadastroEndereco(): void {
    this.formularioAberto.set(false);
    this.formulario.reset();
    this.errosServidor.set({});
  }

  protected salvarEndereco(): void {
    if (this.formulario.invalid || this.salvandoEndereco()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const dados: DadosEndereco = { ...valores, complemento: valores.complemento || null };
    this.invalidarResumoPendente();
    this.resumo.set(null);
    this.salvandoEndereco.set(true);
    this.erro.set(null);
    this.errosServidor.set({});
    this.contaService.criarEndereco(dados).subscribe({
      next: (endereco) => {
        this.invalidarResumoPendente();
        this.enderecos.update((atuais) => [...atuais, endereco]);
        this.enderecoSelecionadoId.set(endereco.id);
        this.etapa.set(1);
        this.formularioAberto.set(false);
        this.formulario.reset();
        this.salvandoEndereco.set(false);
      },
      error: (falha: unknown) => {
        this.erro.set(mensagemDeErro(falha, 'Não foi possível salvar o endereço.'));
        this.errosServidor.set(camposComErro(falha));
        this.salvandoEndereco.set(false);
      },
    });
  }

  protected invalido(campo: CampoEndereco): boolean {
    const controle = this.formulario.controls[campo];
    return controle.invalid && controle.touched;
  }

  protected confirmarPedido(): void {
    if (this.enviando()) {
      return;
    }
    const enderecoId = this.enderecoSelecionadoId();
    if (!this.resumo() || enderecoId === null) {
      return;
    }

    const novoPedido: NovoPedido = { enderecoId, formaPagamento: this.formaPagamento() };
    this.enviando.set(true);
    this.erro.set(null);
    this.erroPedido409.set(false);
    this.pedidoService.criar(novoPedido).subscribe({
      next: (pedido) => {
        this.pedidoConcluido.set(true);
        void this.router
          .navigateByUrl(`/pedidos/${pedido.id}/confirmado`)
          .finally(() => this.carrinhoService.carregar());
      },
      error: (falha: unknown) => {
        this.erro.set(mensagemDeErro(falha, 'Não foi possível confirmar o pedido.'));
        this.erroPedido409.set(falha instanceof HttpErrorResponse && falha.status === 409);
        this.enviando.set(false);
      },
    });
  }

  protected voltarAoCarrinho(): void {
    void this.router.navigateByUrl('/carrinho');
  }

  protected tentarCarregarCarrinho(): void {
    this.carrinhoService.carregar();
  }

  private invalidarResumoPendente(): void {
    this.sequenciaResumo += 1;
    this.requisicaoResumo?.unsubscribe();
    this.requisicaoResumo = null;
    this.carregandoResumo.set(false);
  }

  private resumoAindaAtual(sequencia: number, enderecoId: number): boolean {
    const carrinho = this.carrinho();
    return (
      sequencia === this.sequenciaResumo &&
      enderecoId === this.enderecoSelecionadoId() &&
      this.statusCarrinho() === 'success' &&
      !!carrinho &&
      carrinho.itens.length > 0 &&
      carrinho.podeFinalizar
    );
  }
}
