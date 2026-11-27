import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FiltroPedidosAdmin, PaginaPedidosAdmin, PedidoAdmin } from '../models/admin';
import { StatusPedido } from '../models/pedido';

@Injectable({ providedIn: 'root' })
export class AdminPedidosService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/admin/pedidos';

  listar(filtro: FiltroPedidosAdmin = {}): Observable<PaginaPedidosAdmin> {
    let params = new HttpParams();
    for (const [chave, valor] of Object.entries(filtro)) {
      if (valor === undefined || valor === null || (typeof valor === 'string' && !valor.trim())) {
        continue;
      }
      params = params.set(chave, String(valor));
    }
    return this.http.get<PaginaPedidosAdmin>(this.url, { params });
  }

  buscar(id: number): Observable<PedidoAdmin> {
    return this.http.get<PedidoAdmin>(`${this.url}/${id}`);
  }

  atualizarStatus(id: number, status: StatusPedido): Observable<PedidoAdmin> {
    return this.http.patch<PedidoAdmin>(`${this.url}/${id}/status`, { status });
  }
}
