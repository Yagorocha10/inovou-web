import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { DadosCadastro, Sessao } from '../models/auth';

const CHAVE_SESSAO = 'inovou.sessao';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly sessao = signal<Sessao | null>(this.lerSessaoSalva());

  readonly usuario = computed(() => this.sessao()?.usuario ?? null);
  readonly logado = computed(() => this.sessao() !== null);
  readonly ehAdmin = computed(() => this.usuario()?.role === 'ADMIN');
  readonly primeiroNome = computed(() => this.usuario()?.nome.split(' ')[0] ?? '');

  login(email: string, senha: string): Observable<Sessao> {
    return this.http
      .post<Sessao>('/api/auth/login', { email, senha })
      .pipe(tap((sessao) => this.salvar(sessao)));
  }

  cadastrar(dados: DadosCadastro): Observable<Sessao> {
    return this.http
      .post<Sessao>('/api/auth/cadastro', dados)
      .pipe(tap((sessao) => this.salvar(sessao)));
  }

  token(): string | null {
    const atual = this.sessao();
    if (!atual) {
      return null;
    }
    if (this.expirou(atual)) {
      this.limpar();
      return null;
    }
    return atual.token;
  }

  sair(): void {
    this.limpar();
    this.router.navigateByUrl('/');
  }

  encerrarSessaoExpirada(): void {
    const retorno = this.router.url;
    this.limpar();
    this.router.navigate(['/entrar'], { queryParams: { retorno, expirada: 1 } });
  }

  private salvar(sessao: Sessao): void {
    this.sessao.set(sessao);
    try {
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    } catch {
      return;
    }
  }

  private limpar(): void {
    this.sessao.set(null);
    try {
      localStorage.removeItem(CHAVE_SESSAO);
    } catch {
      return;
    }
  }

  private lerSessaoSalva(): Sessao | null {
    try {
      const salva = localStorage.getItem(CHAVE_SESSAO);
      if (!salva) {
        return null;
      }
      const sessao = JSON.parse(salva) as Sessao;
      if (!sessao?.token || this.expirou(sessao)) {
        localStorage.removeItem(CHAVE_SESSAO);
        return null;
      }
      return sessao;
    } catch {
      return null;
    }
  }

  private expirou(sessao: Sessao): boolean {
    const expiraEm = Date.parse(sessao.expiraEm);
    return Number.isNaN(expiraEm) || expiraEm <= Date.now();
  }
}
