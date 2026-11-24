import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DadosEndereco, Endereco } from '../models/auth';

@Injectable({ providedIn: 'root' })
export class ContaService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/me/enderecos';

  enderecos(): Observable<Endereco[]> {
    return this.http.get<Endereco[]>(this.url);
  }

  criarEndereco(dados: DadosEndereco): Observable<Endereco> {
    return this.http.post<Endereco>(this.url, dados);
  }

  atualizarEndereco(id: number, dados: DadosEndereco): Observable<Endereco> {
    return this.http.put<Endereco>(`${this.url}/${id}`, dados);
  }

  removerEndereco(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
