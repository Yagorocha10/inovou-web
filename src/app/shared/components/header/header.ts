import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CarrinhoService } from '../../../core/services/carrinho.service';
import { CategoriaService } from '../../../core/services/categoria.service';

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

  protected buscar(evento: Event, termo: string): void {
    evento.preventDefault();
    const busca = termo.trim();
    this.router.navigate(['/produtos'], { queryParams: busca ? { busca } : {} });
  }
}
