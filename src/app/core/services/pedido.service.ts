import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Pagina } from '../models/catalogo';
import { NovoPedido, Pedido, PedidoResumo, ResumoCheckout } from '../models/pedido';

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/pedidos';

  resumoCheckout(enderecoId: number): Observable<ResumoCheckout> {
    return this.http.get<ResumoCheckout>('/api/checkout/resumo', {
      params: { enderecoId },
    });
  }

  criar(novoPedido: NovoPedido): Observable<Pedido> {
    return this.http.post<Pedido>(this.url, novoPedido);
  }

  listar(pagina: number, tamanho = 10): Observable<Pagina<PedidoResumo>> {
    const params = new HttpParams().set('pagina', pagina).set('tamanho', tamanho);
    return this.http.get<Pagina<PedidoResumo>>(this.url, { params });
  }

  buscar(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.url}/${id}`);
  }

  cancelar(id: number): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.url}/${id}/cancelar`, null);
  }
}
