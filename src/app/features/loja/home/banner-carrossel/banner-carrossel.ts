import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Banner {
  tipo: 'r36' | 'game-stick' | 'carregadores' | 'pix';
  chamada: string;
  titulo: string;
  texto: string;
  destaques: string[];
  mostrarEntrega: boolean;
  acao: string;
  link: string;
  categoria: string | null;
}

const INTERVALO_MS = 6000;

@Component({
  selector: 'app-banner-carrossel',
  imports: [RouterLink],
  templateUrl: './banner-carrossel.html',
  styleUrl: './banner-carrossel.scss',
})
export class BannerCarrossel implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private pausado = false;

  protected readonly banners: Banner[] = [
    {
      tipo: 'r36',
      chamada: 'Videogame portátil',
      titulo: 'Console portátil R36',
      texto:
        'Jogos clássicos numa tela que cabe no bolso. Leve para a escola, o trabalho ou a viagem.',
      destaques: ['Cabe no bolso', 'Jogos clássicos', 'Bateria recarregável'],
      mostrarEntrega: true,
      acao: 'Ver o console R36',
      link: '/produtos/console-portatil-r36',
      categoria: null,
    },
    {
      tipo: 'game-stick',
      chamada: 'Videogame para TV',
      titulo: 'Game Stick 4K com 2 controles',
      texto:
        'Ligue na TV pelo HDMI e jogue os clássicos com dois controles sem fio. Diversão para a família toda.',
      destaques: ['Imagem 4K', 'Liga no HDMI', '2 controles sem fio'],
      mostrarEntrega: true,
      acao: 'Ver o Game Stick',
      link: '/produtos/game-stick',
      categoria: null,
    },
    {
      tipo: 'carregadores',
      chamada: 'Carregadores e cabos',
      titulo: 'Bateria cheia o dia todo',
      texto: 'Carregadores e cabos para iPhone e Android, com entrega rápida em Belém.',
      destaques: ['iPhone e Android', 'Vários modelos', 'Pronta entrega'],
      mostrarEntrega: true,
      acao: 'Ver carregadores e cabos',
      link: '/produtos',
      categoria: 'carregadores-e-cabos',
    },
    {
      tipo: 'pix',
      chamada: 'Pagamento',
      titulo: 'Pague com Pix na hora',
      texto: 'No fim da compra é só ler o QR Code no app do banco. Sem boleto, sem espera.',
      destaques: ['QR Code', 'Copia e cola', 'Sem boleto'],
      mostrarEntrega: false,
      acao: 'Escolher produtos',
      link: '/produtos',
      categoria: null,
    },
  ];

  protected readonly atual = signal(0);

  protected readonly modulosQr = gerarModulosQr();

  ngOnInit(): void {
    const reduzirMovimento =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduzirMovimento) {
      this.temporizador = setInterval(() => {
        if (!this.pausado) {
          this.proximo();
        }
      }, INTERVALO_MS);
    }
    this.destroyRef.onDestroy(() => {
      if (this.temporizador) {
        clearInterval(this.temporizador);
      }
    });
  }

  protected irPara(indice: number): void {
    const total = this.banners.length;
    this.atual.set(((indice % total) + total) % total);
  }

  protected proximo(): void {
    this.irPara(this.atual() + 1);
  }

  protected anterior(): void {
    this.irPara(this.atual() - 1);
  }

  protected pausar(pausar: boolean): void {
    this.pausado = pausar;
  }
}

function gerarModulosQr(): { x: number; y: number }[] {
  const modulos: { x: number; y: number }[] = [];
  let semente = 7;
  for (let linha = 0; linha < 13; linha++) {
    for (let coluna = 0; coluna < 13; coluna++) {
      const emCanto =
        (linha < 4 && coluna < 4) || (linha < 4 && coluna > 8) || (linha > 8 && coluna < 4);
      semente = (semente * 1103515245 + 12345) % 2147483648;
      if (!emCanto && semente % 100 < 46) {
        modulos.push({ x: 205 + coluna * 8, y: 98 + linha * 8 });
      }
    }
  }
  return modulos;
}
