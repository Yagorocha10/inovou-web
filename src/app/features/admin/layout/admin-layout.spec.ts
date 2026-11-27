import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminLayout } from './admin-layout';

describe('AdminLayout', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('exibe navegação administrativa responsiva e a área de rotas filhas', () => {
    const fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();

    const pagina = fixture.nativeElement as HTMLElement;
    expect(pagina.querySelector('nav[aria-label="Seções do painel"]')).not.toBeNull();
    expect(pagina.querySelectorAll('.admin__nav a').length).toBe(3);
    expect(pagina.querySelector('a[href="/admin/produtos"]')?.textContent?.trim()).toBe('Produtos');
    expect(pagina.querySelector('a[href="/admin/pedidos"]')?.textContent?.trim()).toBe('Pedidos');
    expect(pagina.querySelector('router-outlet')).not.toBeNull();
  });
});
