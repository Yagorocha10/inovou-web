import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

interface Beneficio {
  icone: string;
  texto: string;
}

@Component({
  selector: 'app-faixa-beneficios',
  imports: [MatIconModule],
  templateUrl: './faixa-beneficios.html',
  styleUrl: './faixa-beneficios.scss',
})
export class FaixaBeneficios {
  protected readonly beneficios: Beneficio[] = [
    { icone: 'local_shipping', texto: 'Entrega em Belém em até 2 dias' },
    { icone: 'sell', texto: 'Frete de R$ 10 para Belém' },
    { icone: 'route', texto: 'Região metropolitana em até 3 dias' },
    { icone: 'qr_code_2', texto: 'Pague com Pix pelo QR Code' },
    { icone: 'chat', texto: 'Atendimento no WhatsApp' },
    { icone: 'inventory_2', texto: 'Acompanhe seu pedido pelo site' },
  ];
}
