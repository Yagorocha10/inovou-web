import { Routes } from '@angular/router';
import { Home } from './features/loja/home/home';

export const routes: Routes = [
  { path: '', component: Home, title: 'Inovou Store' },
  { path: '**', redirectTo: '' },
];
