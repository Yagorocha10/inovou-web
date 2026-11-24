import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, Provider } from '@angular/core';

registerLocaleData(localePt, 'pt-BR');

export function provideLocalePtBr(): Provider[] {
  return [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
  ];
}
