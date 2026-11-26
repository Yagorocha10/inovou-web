import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Carrinho } from '../models/carrinho';
import { AuthService } from './auth.service';

export type StatusCarregamentoCarrinho = 'idle' | 'loading' | 'success' | 'error';

@Injectable({ providedIn: 'root' })
export class CarrinhoService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = '/api/carrinho';

  private readonly estado = signal<Carrinho | null>(null);
  private readonly estadoCarregamento = signal<StatusCarregamentoCarrinho>('idle');
  private sequenciaCarregamento = 0;

  readonly carrinho = this.estado.asReadonly();
  readonly quantidadeTotal = computed(() => this.estado()?.quantidadeTotal ?? 0);
  readonly statusCarregamento = this.estadoCarregamento.asReadonly();

  constructor() {
    effect(() => {
      if (this.auth.logado()) {
        untracked(() => this.carregar());
      } else {
        this.sequenciaCarregamento += 1;
        this.estado.set(null);
        this.estadoCarregamento.set('idle');
      }
    });
  }

  carregar(): void {
    const sequencia = ++this.sequenciaCarregamento;
    this.estado.set(null);
    this.estadoCarregamento.set('loading');
    this.http.get<Carrinho>(this.url).subscribe({
      next: (carrinho) => {
        if (sequencia !== this.sequenciaCarregamento) {
          return;
        }
        this.estado.set(carrinho);
        this.estadoCarregamento.set('success');
      },
      error: () => {
        if (sequencia === this.sequenciaCarregamento) {
          this.estadoCarregamento.set('error');
        }
      },
    });
  }

  adicionar(produtoId: number, quantidade: number): Observable<Carrinho> {
    return this.atualizar(this.http.post<Carrinho>(`${this.url}/itens`, { produtoId, quantidade }));
  }

  alterarQuantidade(produtoId: number, quantidade: number): Observable<Carrinho> {
    return this.atualizar(
      this.http.put<Carrinho>(`${this.url}/itens/${produtoId}`, { quantidade }),
    );
  }

  remover(produtoId: number): Observable<Carrinho> {
    return this.atualizar(this.http.delete<Carrinho>(`${this.url}/itens/${produtoId}`));
  }

  esvaziar(): Observable<Carrinho> {
    return this.atualizar(this.http.delete<Carrinho>(this.url));
  }

  private atualizar(requisicao: Observable<Carrinho>): Observable<Carrinho> {
    return requisicao.pipe(
      tap((carrinho) => {
        this.sequenciaCarregamento += 1;
        this.estado.set(carrinho);
        this.estadoCarregamento.set('success');
      }),
    );
  }
}
