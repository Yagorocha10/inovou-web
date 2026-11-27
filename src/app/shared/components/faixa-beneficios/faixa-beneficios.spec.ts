import { TestBed } from '@angular/core/testing';
import { FaixaBeneficios } from './faixa-beneficios';

describe('FaixaBeneficios', () => {
  it('mostra as vantagens reais da loja e esconde a cópia da animação dos leitores de tela', async () => {
    const fixture = TestBed.createComponent(FaixaBeneficios);
    await fixture.whenStable();
    const tela = fixture.nativeElement as HTMLElement;

    const visivel = tela.querySelector('.faixa__lista:not([aria-hidden])');
    expect(visivel?.textContent).toContain('Entrega em Belém em até 2 dias');
    expect(visivel?.textContent).toContain('Pague com Pix pelo QR Code');
    expect(tela.querySelector('.faixa__lista--copia')?.getAttribute('aria-hidden')).toBe('true');
  });
});
