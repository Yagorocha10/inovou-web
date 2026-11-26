import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { CategoriaService } from '../../../core/services/categoria.service';
import { CarrinhoService } from '../../../core/services/carrinho.service';
import { Header } from './header';

describe('Header', () => {
  let fixture: ComponentFixture<Header>;
  let quantidadeCarrinho: ReturnType<typeof signal<number>>;

  async function montar(): Promise<void> {
    fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    quantidadeCarrinho = signal(0);
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: CarrinhoService, useValue: { quantidadeTotal: quantidadeCarrinho } },
        { provide: CategoriaService, useValue: { listar: () => of([]) } },
      ],
    }).compileComponents();
  });

  it('mostra acesso a Minha Conta, Meus pedidos e carrinho quando autenticado', async () => {
    localStorage.setItem(
      'inovou.sessao',
      JSON.stringify({
        token: 'token',
        expiraEm: new Date(Date.now() + 60_000).toISOString(),
        usuario: { id: 5, nome: 'Ana Cliente', email: 'ana@example.test', role: 'CLIENTE' },
      }),
    );
    quantidadeCarrinho.set(2);
    await montar();

    expect(fixture.nativeElement.querySelector('a[aria-label="Minha conta"]')?.getAttribute('href')).toBe('/conta');
    expect(fixture.nativeElement.querySelector('a[aria-label="Meus pedidos"]')?.getAttribute('href')).toBe('/pedidos');
    expect(fixture.nativeElement.querySelector('a[aria-label="Carrinho, 2 itens"]')?.getAttribute('href')).toBe('/carrinho');
    expect(fixture.nativeElement.querySelector('.acoes__badge')?.textContent).toContain('2');

    quantidadeCarrinho.set(4);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.acoes__badge')?.textContent).toContain('4');
  });

  it('não exibe links protegidos de pedidos e conta para visitante', async () => {
    await montar();
    expect(fixture.nativeElement.querySelector('a[aria-label="Meus pedidos"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[aria-label="Minha conta"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/entrar"]')).not.toBeNull();
  });
});
