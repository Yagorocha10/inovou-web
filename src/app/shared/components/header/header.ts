import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface Categoria {
  nome: string;
  slug: string;
}

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  protected readonly quantidadeCarrinho = signal(0);

  protected readonly categorias: Categoria[] = [
    { nome: 'Eletrônicos', slug: 'eletronicos' },
    { nome: 'Carregadores e cabos', slug: 'carregadores-e-cabos' },
    { nome: 'Games e controles', slug: 'games-e-controles' },
    { nome: 'Relógios', slug: 'relogios' },
    { nome: 'Barbeadores', slug: 'barbeadores' },
    { nome: 'Ferramentas', slug: 'ferramentas' },
  ];
}
