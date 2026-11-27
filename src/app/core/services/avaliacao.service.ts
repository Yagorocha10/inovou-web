import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Avaliacao, AvaliacoesDoProduto, Depoimento, PermissaoAvaliacao } from '../models/catalogo';

@Injectable({ providedIn: 'root' })
export class AvaliacaoService {
  private readonly http = inject(HttpClient);

  doProduto(slug: string, pagina = 0, tamanho = 5): Observable<AvaliacoesDoProduto> {
    return this.http.get<AvaliacoesDoProduto>(`${this.urlDoProduto(slug)}`, {
      params: { pagina, tamanho },
    });
  }

  permissao(slug: string): Observable<PermissaoAvaliacao> {
    return this.http.get<PermissaoAvaliacao>(`${this.urlDoProduto(slug)}/permissao`);
  }

  avaliar(slug: string, nota: number, comentario: string | null): Observable<Avaliacao> {
    return this.http.post<Avaliacao>(this.urlDoProduto(slug), { nota, comentario });
  }

  recentes(limite = 3): Observable<Depoimento[]> {
    return this.http.get<Depoimento[]>('/api/avaliacoes/recentes', { params: { limite } });
  }

  private urlDoProduto(slug: string): string {
    return `/api/produtos/${encodeURIComponent(slug)}/avaliacoes`;
  }
}
