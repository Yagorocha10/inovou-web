import { Routes } from '@angular/router';
import { adminGuard, authGuard, visitanteGuard } from './core/guards/auth.guards';

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
  {
    path: 'entrar',
    canActivate: [visitanteGuard],
    loadComponent: () => import('./features/conta/entrar/entrar').then((m) => m.Entrar),
    title: 'Entrar | Inovou Store',
  },
  {
    path: 'cadastro',
    canActivate: [visitanteGuard],
    loadComponent: () => import('./features/conta/cadastro/cadastro').then((m) => m.Cadastro),
    title: 'Criar conta | Inovou Store',
  },
  {
    path: 'conta',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/conta/minha-conta/minha-conta').then((m) => m.MinhaConta),
    title: 'Minha conta | Inovou Store',
  },
  {
    path: 'carrinho',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/carrinho/carrinho-pagina').then((m) => m.CarrinhoPagina),
    title: 'Carrinho | Inovou Store',
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/painel/painel').then((m) => m.Painel),
    title: 'Admin | Inovou Store',
  },
  { path: '**', redirectTo: '' },
];
