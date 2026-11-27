import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-nao-encontrado-admin',
  imports: [RouterLink],
  template: `
    <section class="estado-admin" aria-labelledby="titulo-nao-encontrado">
      <p class="estado-admin__codigo">404</p>
      <h1 id="titulo-nao-encontrado">Página administrativa não encontrada</h1>
      <p>O endereço solicitado não corresponde a uma seção do painel.</p>
      <a class="botao botao--primario" routerLink="/admin">Voltar ao painel</a>
    </section>
  `,
  styles: `
    .estado-admin { display: grid; justify-items: center; gap: 12px; padding: 48px 20px; text-align: center; }
    .estado-admin h1, .estado-admin p { margin: 0; }
    .estado-admin p { color: var(--inovou-text-muted); }
    .estado-admin .estado-admin__codigo { color: var(--inovou-blue); font-size: 48px; font-weight: 750; }
  `,
})
export class NaoEncontradoAdmin {}
