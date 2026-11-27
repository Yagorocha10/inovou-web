import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DadosProduto,
  FiltroProdutosAdmin,
  PaginaProdutosAdmin,
  ProdutoAdmin,
} from '../models/admin';

@Injectable({ providedIn: 'root' })
export class AdminProdutosService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/admin/produtos';

  listar(filtro: FiltroProdutosAdmin = {}): Observable<PaginaProdutosAdmin> {
    let params = new HttpParams();
    for (const [chave, valor] of Object.entries(filtro)) {
      if (valor === undefined || valor === null || (typeof valor === 'string' && !valor.trim())) {
        continue;
      }
      params = params.set(chave, String(valor));
    }
    return this.http.get<PaginaProdutosAdmin>(this.url, { params });
  }

  buscar(id: number): Observable<ProdutoAdmin> {
    return this.http.get<ProdutoAdmin>(`${this.url}/${id}`);
  }

  criar(dados: DadosProduto): Observable<ProdutoAdmin> {
    return this.http.post<ProdutoAdmin>(this.url, dados);
  }

  atualizar(id: number, dados: DadosProduto): Observable<ProdutoAdmin> {
    return this.http.put<ProdutoAdmin>(`${this.url}/${id}`, dados);
  }

  atualizarAtivo(id: number, ativo: boolean): Observable<ProdutoAdmin> {
    return this.http.patch<ProdutoAdmin>(`${this.url}/${id}/ativo`, { ativo });
  }

  enviarImagem(id: number, arquivo: File): Observable<HttpEvent<ProdutoAdmin>> {
    const formulario = new FormData();
    formulario.append('arquivo', arquivo);
    return this.http.post<ProdutoAdmin>(`${this.url}/${id}/imagens`, formulario, {
      reportProgress: true,
      observe: 'events' as const,
    });
  }

  removerImagem(id: number, imagemId: number): Observable<ProdutoAdmin> {
    return this.http.delete<ProdutoAdmin>(`${this.url}/${id}/imagens/${imagemId}`);
  }

  ordenarImagens(id: number, ids: number[]): Observable<ProdutoAdmin> {
    return this.http.put<ProdutoAdmin>(`${this.url}/${id}/imagens/ordem`, { ids });
  }
}
