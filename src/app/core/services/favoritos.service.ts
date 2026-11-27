import { computed, Injectable, signal } from '@angular/core';

const CHAVE_FAVORITOS = 'inovou.favoritos';

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  private readonly slugs = signal<string[]>(this.ler());

  readonly lista = this.slugs.asReadonly();
  readonly quantidade = computed(() => this.slugs().length);

  ehFavorito(slug: string): boolean {
    return this.slugs().includes(slug);
  }

  alternar(slug: string): void {
    const atuais = this.slugs();
    const novos = atuais.includes(slug)
      ? atuais.filter((atual) => atual !== slug)
      : [slug, ...atuais];
    this.slugs.set(novos);
    this.salvar(novos);
  }

  remover(slug: string): void {
    const novos = this.slugs().filter((atual) => atual !== slug);
    this.slugs.set(novos);
    this.salvar(novos);
  }

  private ler(): string[] {
    try {
      const salvos: unknown = JSON.parse(localStorage.getItem(CHAVE_FAVORITOS) ?? '[]');
      return Array.isArray(salvos)
        ? salvos.filter((slug): slug is string => typeof slug === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private salvar(slugs: string[]): void {
    try {
      localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(slugs));
    } catch {
      return;
    }
  }
}
