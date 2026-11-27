import { TestBed } from '@angular/core/testing';
import { FavoritosService } from './favoritos.service';

describe('FavoritosService', () => {
  it('guarda e tira favoritos e mantém a lista salva no navegador', () => {
    const favoritos = TestBed.inject(FavoritosService);

    favoritos.alternar('game-stick');
    favoritos.alternar('console-portatil-r36');

    expect(favoritos.lista()).toEqual(['console-portatil-r36', 'game-stick']);
    expect(favoritos.ehFavorito('game-stick')).toBe(true);
    expect(JSON.parse(localStorage.getItem('inovou.favoritos')!)).toEqual([
      'console-portatil-r36',
      'game-stick',
    ]);

    favoritos.alternar('game-stick');

    expect(favoritos.ehFavorito('game-stick')).toBe(false);
    expect(favoritos.quantidade()).toBe(1);
  });

  it('ignora lixo salvo no navegador', () => {
    localStorage.setItem('inovou.favoritos', '{"nao":"é lista"}');

    expect(TestBed.inject(FavoritosService).lista()).toEqual([]);
  });
});
