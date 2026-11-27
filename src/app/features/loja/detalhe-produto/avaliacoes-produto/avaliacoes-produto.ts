import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { mensagemDeErro } from '../../../../core/erro-api';
import { PermissaoAvaliacao } from '../../../../core/models/catalogo';
import { AuthService } from '../../../../core/services/auth.service';
import { AvaliacaoService } from '../../../../core/services/avaliacao.service';

const SEM_PERMISSAO: PermissaoAvaliacao = { podeAvaliar: false, motivo: null };

@Component({
  selector: 'app-avaliacoes-produto',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './avaliacoes-produto.html',
  styleUrl: './avaliacoes-produto.scss',
})
export class AvaliacoesProduto {
  private readonly avaliacaoService = inject(AvaliacaoService);
  protected readonly auth = inject(AuthService);

  readonly slug = input.required<string>();

  protected readonly avaliacoes = rxResource({
    params: () => this.slug(),
    stream: ({ params }) => this.avaliacaoService.doProduto(params),
  });

  protected readonly permissao = rxResource({
    params: () => (this.auth.logado() ? this.slug() : undefined),
    stream: ({ params }) =>
      this.avaliacaoService.permissao(params).pipe(catchError(() => of(SEM_PERMISSAO))),
  });

  protected readonly formulario = new FormGroup({
    nota: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(5),
    ]),
    comentario: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
  });

  protected readonly opcoesDeNota = [1, 2, 3, 4, 5];
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly enviada = signal(false);

  protected estrelas(nota: number): number[] {
    return Array.from({ length: Math.round(nota) }, (_, indice) => indice);
  }

  protected escolherNota(nota: number): void {
    this.formulario.controls.nota.setValue(nota);
    this.formulario.controls.nota.markAsTouched();
  }

  protected enviar(): void {
    if (this.enviando()) {
      return;
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { nota, comentario } = this.formulario.getRawValue();
    this.enviando.set(true);
    this.erro.set(null);
    this.avaliacaoService.avaliar(this.slug(), nota!, comentario.trim() || null).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviada.set(true);
        this.formulario.reset();
        this.avaliacoes.reload();
        this.permissao.reload();
      },
      error: (falha: unknown) => {
        this.enviando.set(false);
        this.erro.set(mensagemDeErro(falha, 'Não foi possível enviar sua avaliação.'));
      },
    });
  }
}
