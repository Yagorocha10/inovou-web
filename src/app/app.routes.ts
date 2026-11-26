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
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/checkout/checkout-pagina/checkout-pagina').then((m) => m.CheckoutPagina),
    title: 'Checkout | Inovou Store',
  },
  {
    path: 'pedidos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/pedidos/meus-pedidos/meus-pedidos').then((m) => m.MeusPedidos),
    title: 'Meus pedidos | Inovou Store',
  },
  {
    path: 'pedidos/:id/confirmado',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/pedidos/pedido-confirmado/pedido-confirmado').then(
        (m) => m.PedidoConfirmado,
      ),
    title: 'Pedido confirmado | Inovou Store',
  },
  {
    path: 'pedidos/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/pedidos/detalhe-pedido/detalhe-pedido').then((m) => m.DetalhePedido),
    title: 'Detalhes do pedido | Inovou Store',
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/painel/painel').then((m) => m.Painel),
    title: 'Admin | Inovou Store',
  },
  { path: '**', redirectTo: '' },
];
