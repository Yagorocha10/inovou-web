import { Component, computed, input, resource, signal } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-pagamento-pix',
  templateUrl: './pagamento-pix.html',
  styleUrl: './pagamento-pix.scss',
})
export class PagamentoPix {
  readonly codigo = input.required<string>();

  protected readonly copiado = signal(false);
  protected readonly falhouAoCopiar = signal(false);

  protected readonly pixReal = computed(() => this.codigo().startsWith('000201'));

  protected readonly qrCode = resource({
    params: () => (this.pixReal() ? this.codigo() : undefined),
    loader: ({ params }) =>
      QRCode.toDataURL(params, { errorCorrectionLevel: 'M', margin: 1, width: 440 }),
  });

  protected async copiar(): Promise<void> {
    this.falhouAoCopiar.set(false);
    try {
      await navigator.clipboard.writeText(this.codigo());
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 3000);
    } catch {
      this.falhouAoCopiar.set(true);
    }
  }
}
