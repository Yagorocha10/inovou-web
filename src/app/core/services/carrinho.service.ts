import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Carrinho } from '../models/carrinho';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CarrinhoService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = '/api/carrinho';

  private readonly estado = signal<Carrinho | null>(null);

  readonly carrinho = this.estado.asReadonly();
  readonly quantidadeTotal = computed(() => this.estado()?.quantidadeTotal ?? 0);

  constructor() {
    effect(() => {
      if (this.auth.logado()) {
        untracked(() => this.carregar());
      } else {
        this.estado.set(null);
      }
    });
  }

  carregar(): void {
    this.http.get<Carrinho>(this.url).subscribe({
      next: (carrinho) => this.estado.set(carrinho),
      error: () => undefined,
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
    return requisicao.pipe(tap((carrinho) => this.estado.set(carrinho)));
  }
}
