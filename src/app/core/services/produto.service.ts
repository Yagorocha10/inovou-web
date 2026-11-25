import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FiltroProdutos, Pagina, ProdutoDetalhe, ProdutoResumo } from '../models/catalogo';

@Injectable({ providedIn: 'root' })
export class ProdutoService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/produtos';

  buscar(filtro: FiltroProdutos): Observable<Pagina<ProdutoResumo>> {
    let params = new HttpParams();
    for (const [chave, valor] of Object.entries(filtro)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(chave, String(valor));
      }
    }
    return this.http.get<Pagina<ProdutoResumo>>(this.url, { params });
  }

  detalhar(slug: string): Observable<ProdutoDetalhe> {
    return this.http.get<ProdutoDetalhe>(`${this.url}/${encodeURIComponent(slug)}`);
  }

  destaques(limite = 8): Observable<ProdutoResumo[]> {
    return this.http.get<ProdutoResumo[]>(`${this.url}/destaques`, {
      params: { limite },
    });
  }
}
