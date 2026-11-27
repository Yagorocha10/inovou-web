import { CanDeactivateFn } from '@angular/router';

export interface ConfirmavelAoSair {
  podeSair(): boolean;
}

export const alteracoesNaoSalvasGuard: CanDeactivateFn<ConfirmavelAoSair> = (componente) =>
  componente.podeSair();
