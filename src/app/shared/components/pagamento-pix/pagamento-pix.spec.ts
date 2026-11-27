import { TestBed } from '@angular/core/testing';
import { PagamentoPix } from './pagamento-pix';

const PIX_REAL =
  '00020126330014br.gov.bcb.pix011100000000000520400005303986540550.005802BR' +
  '5912INOVOU STORE6005BELEM62130509INV0000426304ABCD';

describe('PagamentoPix', () => {
  async function montar(codigo: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(PagamentoPix);
    fixture.componentRef.setInput('codigo', codigo);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra o QR Code e o código copia e cola de um Pix real', async () => {
    const tela = await montar(PIX_REAL);

    const qr = tela.querySelector('img') as HTMLImageElement;
    expect(qr.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(tela.querySelector('.pix__codigo')?.textContent).toContain(PIX_REAL);
  });

  it('não gera QR Code para o Pix simulado e avisa que não pode ser pago', async () => {
    const tela = await montar('PIX-SIMULADO.INOVOU-STORE.INV-000001.50.00');

    expect(tela.querySelector('img')).toBeNull();
    expect(tela.textContent).toContain('modo de simulação');
  });

  it('copia o código para a área de transferência', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const fixture = TestBed.createComponent(PagamentoPix);
    fixture.componentRef.setInput('codigo', PIX_REAL);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(PIX_REAL);
    expect(fixture.nativeElement.querySelector('button').textContent).toContain('Código copiado!');
  });
});
