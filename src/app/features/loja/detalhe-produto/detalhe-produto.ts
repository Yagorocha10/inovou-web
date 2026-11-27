import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { mensagemDeErro } from '../../../core/erro-api';
import { AuthService } from '../../../core/services/auth.service';
import { CarrinhoService } from '../../../core/services/carrinho.service';
import { ProdutoService } from '../../../core/services/produto.service';

const WHATSAPP_LOJA = '559187226520';

@Component({
  selector: 'app-detalhe-produto',
  imports: [RouterLink, CurrencyPipe, MatIconModule],
  templateUrl: './detalhe-produto.html',
  styleUrl: './detalhe-produto.scss',
})
export class DetalheProduto {
  private readonly produtoService = inject(ProdutoService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly title = inject(Title);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly carrinho = inject(CarrinhoService);

  readonly slug = input.required<string>();

  protected readonly produto = rxResource({
    params: () => this.slug(),
    stream: ({ params }) => this.produtoService.detalhar(params),
  });

  protected readonly imagemSelecionada = signal(0);
  protected readonly quantidade = signal(1);
  protected readonly adicionando = signal(false);
  protected readonly comprando = signal(false);

  protected readonly naoEncontrado = computed(() => {
    const erro = this.produto.error() as { cause?: unknown } | undefined;
    const causa = erro?.cause ?? erro;
    return causa instanceof HttpErrorResponse && causa.status === 404;
  });

  protected readonly linkWhatsApp = computed(() => {
    const nome = this.produto.hasValue() ? this.produto.value().nome : '';
    const texto = encodeURIComponent(`Olá! Tenho interesse no produto: ${nome}`);
    return `https://wa.me/${WHATSAPP_LOJA}?text=${texto}`;
  });

  constructor() {
    effect(() => {
      if (this.produto.hasValue()) {
        const produto = this.produto.value();
        this.title.setTitle(`${produto.nome} | Inovou Store`);
        this.imagemSelecionada.set(0);
        this.quantidade.set(1);
      }
    });
  }

  protected alterarQuantidade(delta: number): void {
    const maximo = this.produto.hasValue() ? this.produto.value().estoque : 1;
    this.quantidade.update((atual) => Math.min(Math.max(atual + delta, 1), Math.max(maximo, 1)));
  }

  protected adicionarAoCarrinho(): void {
    if (!this.podeComprar()) {
      return;
    }
    this.adicionando.set(true);
    this.carrinho.adicionar(this.produto.value()!.id, this.quantidade()).subscribe({
      next: () => {
        this.adicionando.set(false);
        this.snackBar
          .open('Produto adicionado ao carrinho', 'Ver carrinho', { duration: 4000 })
          .onAction()
          .subscribe(() => this.router.navigate(['/carrinho']));
      },
      error: (falha: unknown) => {
        this.adicionando.set(false);
        this.avisarErro(falha, 'Não foi possível adicionar ao carrinho.');
      },
    });
  }

  protected comprarAgora(): void {
    if (!this.podeComprar()) {
      return;
    }
    this.comprando.set(true);
    this.carrinho.adicionar(this.produto.value()!.id, this.quantidade()).subscribe({
      next: () => {
        this.comprando.set(false);
        this.router.navigate(['/checkout']);
      },
      error: (falha: unknown) => {
        this.comprando.set(false);
        this.avisarErro(falha, 'Não foi possível iniciar a compra.');
      },
    });
  }

  private podeComprar(): boolean {
    if (!this.auth.logado()) {
      this.router.navigate(['/entrar'], { queryParams: { retorno: `/produtos/${this.slug()}` } });
      return false;
    }
    return this.produto.hasValue();
  }

  private avisarErro(falha: unknown, padrao: string): void {
    this.snackBar.open(mensagemDeErro(falha, padrao), 'OK', { duration: 5000 });
  }
}
