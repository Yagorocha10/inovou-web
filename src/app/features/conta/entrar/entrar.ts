import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { mensagemDeErro, retornoSeguro } from '../../../core/erro-api';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-entrar',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './entrar.html',
})
export class Entrar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly retorno = input<string>();
  readonly expirada = input<string>();

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly destino = computed(() => retornoSeguro(this.retorno(), '/conta'));

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });

  protected entrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { email, senha } = this.formulario.getRawValue();
    this.enviando.set(true);
    this.erro.set(null);
    this.auth.login(email, senha).subscribe({
      next: () => this.router.navigateByUrl(this.destino()),
      error: (falha: unknown) => {
        this.erro.set(mensagemDeErro(falha, 'Não foi possível entrar. Tente de novo.'));
        this.enviando.set(false);
      },
    });
  }

  protected invalido(campo: 'email' | 'senha'): boolean {
    const controle = this.formulario.controls[campo];
    return controle.invalid && controle.touched;
  }
}
