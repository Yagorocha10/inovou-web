import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_rota, estado) => {
  if (inject(AuthService).logado()) {
    return true;
  }
  return inject(Router).createUrlTree(['/entrar'], { queryParams: { retorno: estado.url } });
};

export const adminGuard: CanActivateFn = (_rota, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.logado()) {
    return router.createUrlTree(['/entrar'], { queryParams: { retorno: estado.url } });
  }
  return auth.ehAdmin() ? true : router.createUrlTree(['/']);
};

export const visitanteGuard: CanActivateFn = () => {
  return inject(AuthService).logado() ? inject(Router).createUrlTree(['/conta']) : true;
};
