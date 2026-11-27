import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLocalePtBr } from '../../../core/locale';
import { FavoritosService } from '../../../core/services/favoritos.service';
import { Favoritos } from './favoritos';

describe('Favoritos', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLocalePtBr(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
  });

  it('mostra o convite quando não há favoritos', async () => {
    const fixture = TestBed.createComponent(Favoritos);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Você ainda não tem favoritos.',
    );
  });

  it('carrega os produtos favoritos e ignora os que saíram da loja', async () => {
    const favoritos = TestBed.inject(FavoritosService);
    favoritos.alternar('produto-removido');
    favoritos.alternar('game-stick');
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Favoritos);
    fixture.detectChanges();

    http.expectOne('/api/produtos/game-stick').flush({
      id: 5,
      nome: 'Game Stick',
      slug: 'game-stick',
      descricao: '',
      preco: 50,
      estoque: 2,
      disponivel: true,
      categoria: { id: 2, nome: 'Games', slug: 'games' },
      imagens: ['/uploads/game-stick.jpg'],
    });
    http
      .expectOne('/api/produtos/produto-removido')
      .flush({ mensagem: 'Produto não encontrado' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('app-card-produto');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('Game Stick');
    http.verify();
  });
});
