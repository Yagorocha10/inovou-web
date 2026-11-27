import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLocalePtBr } from '../../../core/locale';
import { ProdutoResumo } from '../../../core/models/catalogo';
import { CardProduto } from './card-produto';

const controle: ProdutoResumo = {
  id: 1,
  nome: 'Controle PS4 sem fio Bluetooth',
  slug: 'controle-ps4-sem-fio-bluetooth',
  preco: 129.9,
  imagemPrincipal: null,
  categoria: { id: 3, nome: 'Games e controles', slug: 'games-e-controles' },
  disponivel: true,
};

describe('CardProduto', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardProduto],
      providers: [
        provideRouter([]),
        provideLocalePtBr(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('deve mostrar nome, categoria, preço em reais e link do produto', async () => {
    const fixture = TestBed.createComponent(CardProduto);
    fixture.componentRef.setInput('produto', controle);
    await fixture.whenStable();

    const card = fixture.nativeElement as HTMLElement;
    expect(card.querySelector('.card__nome')?.textContent).toContain('Controle PS4');
    expect(card.querySelector('.card__categoria')?.textContent).toContain('Games e controles');
    expect(card.querySelector('.card__preco')?.textContent?.replace(/\s/g, ' ')).toContain(
      'R$ 129,90',
    );
    expect(card.querySelector('a')?.getAttribute('href')).toBe(
      '/produtos/controle-ps4-sem-fio-bluetooth',
    );
    expect(card.querySelector('.card__selo')).toBeNull();
  });

  it('deve mostrar o selo de esgotado', async () => {
    const fixture = TestBed.createComponent(CardProduto);
    fixture.componentRef.setInput('produto', { ...controle, disponivel: false });
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.card__selo')?.textContent,
    ).toContain('Esgotado');
  });

  it('visitante que clica em Adicionar vai para o login e volta ao produto', async () => {
    localStorage.clear();
    const fixture = TestBed.createComponent(CardProduto);
    fixture.componentRef.setInput('produto', controle);
    await fixture.whenStable();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    (fixture.nativeElement.querySelector('button.card__acao') as HTMLButtonElement).click();

    expect(navegar).toHaveBeenCalledWith(['/entrar'], {
      queryParams: { retorno: '/produtos/controle-ps4-sem-fio-bluetooth' },
    });
  });

  it('produto esgotado não tem botão de adicionar, só ver detalhes', async () => {
    const fixture = TestBed.createComponent(CardProduto);
    fixture.componentRef.setInput('produto', { ...controle, disponivel: false });
    await fixture.whenStable();
    const card = fixture.nativeElement as HTMLElement;

    expect(card.querySelector('button.card__acao')).toBeNull();
    expect(card.querySelector('.card__acao--detalhes')?.textContent).toContain('Ver detalhes');
  });

  it('mostra o selo de desconto, o preço riscado, o preço no Pix e a nota média', async () => {
    const fixture = TestBed.createComponent(CardProduto);
    fixture.componentRef.setInput('produto', {
      ...controle,
      preco: 149.9,
      precoAnterior: 199.9,
      percentualDesconto: 25,
      precoPix: 142.4,
      notaMedia: 4.7,
      totalAvaliacoes: 3,
    });
    await fixture.whenStable();
    const card = fixture.nativeElement as HTMLElement;
    const texto = (seletor: string) =>
      card.querySelector(seletor)?.textContent?.replace(/\s/g, ' ');

    expect(texto('.card__selo')).toContain('-25%');
    expect(texto('.card__preco-anterior')).toContain('R$ 199,90');
    expect(texto('.card__pix')).toContain('ou R$ 142,40 no Pix');
    expect(texto('.card__avaliacao')).toContain('4,7');
    expect(texto('.card__avaliacao')).toContain('(3)');
  });

  it('sem promoção nem avaliações não inventa selo, preço riscado ou estrelas', async () => {
    const fixture = TestBed.createComponent(CardProduto);
    fixture.componentRef.setInput('produto', controle);
    await fixture.whenStable();
    const card = fixture.nativeElement as HTMLElement;

    expect(card.querySelector('.card__selo--desconto')).toBeNull();
    expect(card.querySelector('.card__preco-anterior')).toBeNull();
    expect(card.querySelector('.card__avaliacao')).toBeNull();
  });

  it('o coração guarda e tira o produto dos favoritos', async () => {
    const fixture = TestBed.createComponent(CardProduto);
    fixture.componentRef.setInput('produto', controle);
    await fixture.whenStable();
    const coracao = (fixture.nativeElement as HTMLElement).querySelector(
      '.card__favorito',
    ) as HTMLButtonElement;

    coracao.click();
    await fixture.whenStable();
    expect(coracao.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('inovou.favoritos')).toContain('controle-ps4-sem-fio-bluetooth');

    coracao.click();
    await fixture.whenStable();
    expect(coracao.getAttribute('aria-pressed')).toBe('false');
  });
});
