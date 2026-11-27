import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CarrinhoService } from '../../../core/services/carrinho.service';
import { CategoriaService } from '../../../core/services/categoria.service';
import { FavoritosService } from '../../../core/services/favoritos.service';

const CATEGORIAS_NO_MENU = 5;

@Component({
  selector: 'app-header',
  imports: [RouterLink, MatIconModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly quantidadeCarrinho = inject(CarrinhoService).quantidadeTotal;

  protected readonly categorias = toSignal(
    inject(CategoriaService)
      .listar()
      .pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  protected readonly favoritos = inject(FavoritosService);

  protected readonly categoriasDoMenu = computed(() =>
    (this.categorias() ?? []).slice(0, CATEGORIAS_NO_MENU),
  );

  protected readonly menuAberto = signal(false);

  protected alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  protected buscar(evento: Event, termo: string): void {
    evento.preventDefault();
    this.menuAberto.set(false);
    const busca = termo.trim();
    this.router.navigate(['/produtos'], { queryParams: busca ? { busca } : {} });
  }
}
