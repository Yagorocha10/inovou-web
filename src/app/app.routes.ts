import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/loja/home/home').then((m) => m.Home),
    title: 'Inovou Store',
  },
  {
    path: 'produtos',
    loadComponent: () => import('./features/loja/catalogo/catalogo').then((m) => m.Catalogo),
    title: 'Produtos | Inovou Store',
  },
  {
    path: 'produtos/:slug',
    loadComponent: () =>
      import('./features/loja/detalhe-produto/detalhe-produto').then((m) => m.DetalheProduto),
    title: 'Produto | Inovou Store',
  },
  { path: '**', redirectTo: '' },
];
