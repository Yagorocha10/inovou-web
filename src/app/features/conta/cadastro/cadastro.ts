import { Component, computed, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { camposComErro, mensagemDeErro, retornoSeguro } from '../../../core/erro-api';
import { AuthService } from '../../../core/services/auth.service';

type CampoCadastro = 'nome' | 'email' | 'senha' | 'confirmacao';

function senhasIguais(grupo: AbstractControl): ValidationErrors | null {
  const senha = grupo.get('senha')?.value;
  const confirmacao = grupo.get('confirmacao')?.value;
  return senha && confirmacao && senha !== confirmacao ? { senhasDiferentes: true } : null;
}

@Component({
  selector: 'app-cadastro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './cadastro.html',
})
export class Cadastro {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly retorno = input<string>();

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly errosServidor = signal<Record<string, string>>({});
  protected readonly destino = computed(() => retornoSeguro(this.retorno(), '/conta'));

  protected readonly formulario = inject(FormBuilder).nonNullable.group(
    {
      nome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
      senha: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmacao: ['', Validators.required],
    },
    { validators: senhasIguais },
  );

  protected cadastrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { nome, email, senha } = this.formulario.getRawValue();
    this.enviando.set(true);
    this.erro.set(null);
    this.errosServidor.set({});
    this.auth.cadastrar({ nome, email, senha }).subscribe({
      next: () => this.router.navigateByUrl(this.destino()),
      error: (falha: unknown) => {
        this.erro.set(mensagemDeErro(falha, 'Não foi possível criar a conta. Tente de novo.'));
        this.errosServidor.set(camposComErro(falha));
        this.enviando.set(false);
      },
    });
  }

  protected invalido(campo: CampoCadastro): boolean {
    const controle = this.formulario.controls[campo];
    return controle.invalid && controle.touched;
  }

  protected senhasDiferentes(): boolean {
    return (
      this.formulario.hasError('senhasDiferentes') && this.formulario.controls.confirmacao.touched
    );
  }
}
