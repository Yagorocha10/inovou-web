import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ContaService } from '../../../core/services/conta.service';
import { MinhaConta } from './minha-conta';

describe('MinhaConta', () => {
  let fixture: ComponentFixture<MinhaConta>;
  let enderecos: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    enderecos = vi.fn(() => of([]));
    await TestBed.configureTestingModule({
      imports: [MinhaConta],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { usuario: signal(null), sair: vi.fn() },
        },
        {
          provide: ContaService,
          useValue: {
            enderecos,
            criarEndereco: vi.fn(),
            atualizarEndereco: vi.fn(),
            removerEndereco: vi.fn(),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MinhaConta);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('mantém a listagem de endereços e oferece navegação para Meus pedidos', () => {
    expect(enderecos).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Endereços de entrega');
    expect(fixture.nativeElement.querySelector('a[href="/pedidos"]')?.textContent).toContain(
      'Acessar meus pedidos',
    );
  });
});
