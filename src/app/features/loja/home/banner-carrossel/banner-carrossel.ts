import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Banner {
  tipo: 'games' | 'carregadores' | 'pix';
  titulo: string;
  texto: string;
  acao: string;
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
      tipo: 'games',
      titulo: 'Games na palma da mão',
      texto: 'Controles sem fio e consoles portáteis para jogar em casa ou levar para onde quiser.',
      acao: 'Ver games e controles',
      categoria: 'games-e-controles',
    },
    {
      tipo: 'carregadores',
      titulo: 'Bateria cheia o dia todo',
      texto: 'Carregadores e cabos para iPhone e Android, com entrega rápida em Belém.',
      acao: 'Ver carregadores e cabos',
      categoria: 'carregadores-e-cabos',
    },
    {
      tipo: 'pix',
      titulo: 'Pague com Pix na hora',
      texto: 'No fim da compra é só ler o QR Code no app do banco. Sem boleto, sem espera.',
      acao: 'Escolher produtos',
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
