import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BannerCarrossel } from './banner-carrossel';

describe('BannerCarrossel', () => {
  async function montar(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [BannerCarrossel],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(BannerCarrossel);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function visivel(tela: HTMLElement): string {
    const ativo = tela.querySelector('.banner:not([aria-hidden="true"]) .banner__titulo');
    return ativo?.textContent?.trim() ?? '';
  }

  it('mostra um banner por vez e navega pelas setas', async () => {
    const tela = await montar();
    expect(tela.querySelectorAll('.banner')).toHaveLength(4);
    expect(visivel(tela)).toBe('Console portátil R36');

    (tela.querySelector('[aria-label="Próximo banner"]') as HTMLButtonElement).click();
    TestBed.tick();
    expect(visivel(tela)).toBe('Games na palma da mão');

    (tela.querySelector('[aria-label="Banner anterior"]') as HTMLButtonElement).click();
    (tela.querySelector('[aria-label="Banner anterior"]') as HTMLButtonElement).click();
    TestBed.tick();
    expect(visivel(tela)).toBe('Pague com Pix na hora');
  });

  it('o banner do R36 leva direto à página do produto', async () => {
    const tela = await montar();

    const acao = tela.querySelector('.banner:not([aria-hidden="true"]) .banner__acao');
    expect(acao?.getAttribute('href')).toBe('/produtos/console-portatil-r36');
  });

  it('os pontos levam direto ao banner escolhido e o botão abre a categoria', async () => {
    const tela = await montar();

    (tela.querySelectorAll('.carrossel__ponto')[2] as HTMLButtonElement).click();
    TestBed.tick();

    expect(visivel(tela)).toBe('Bateria cheia o dia todo');
    const acao = tela.querySelector('.banner:not([aria-hidden="true"]) .banner__acao');
    expect(acao?.getAttribute('href')).toBe('/produtos?categoria=carregadores-e-cabos');
  });
});
