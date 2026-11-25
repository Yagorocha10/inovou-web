import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-painel',
  template: `
    <section class="cartao">
      <h1 class="cartao__titulo">Painel administrativo</h1>
      <p class="cartao__subtitulo">
        Olá, {{ auth.primeiroNome() }}. Você está logado como administrador. O cadastro de produtos
        e a gestão de pedidos chegam na Sprint 6.
      </p>
    </section>
  `,
})
export class Painel {
  protected readonly auth = inject(AuthService);
}
