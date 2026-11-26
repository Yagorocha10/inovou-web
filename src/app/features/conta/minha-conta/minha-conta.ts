import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { camposComErro, mensagemDeErro } from '../../../core/erro-api';
import { DadosEndereco, Endereco, UFS } from '../../../core/models/auth';
import { AuthService } from '../../../core/services/auth.service';
import { ContaService } from '../../../core/services/conta.service';

type CampoEndereco = keyof DadosEndereco;

@Component({
  selector: 'app-minha-conta',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './minha-conta.html',
  styleUrl: './minha-conta.scss',
})
export class MinhaConta {
  protected readonly auth = inject(AuthService);
  private readonly contaService = inject(ContaService);

  protected readonly ufs = UFS;
  protected readonly enderecos = rxResource({ stream: () => this.contaService.enderecos() });

  protected readonly formularioAberto = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly errosServidor = signal<Record<string, string>>({});

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    cep: ['', [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)]],
    logradouro: ['', [Validators.required, Validators.maxLength(150)]],
    numero: ['', [Validators.required, Validators.maxLength(20)]],
    complemento: ['', Validators.maxLength(80)],
    bairro: ['', [Validators.required, Validators.maxLength(80)]],
    cidade: ['Belém', [Validators.required, Validators.maxLength(80)]],
    uf: ['PA', Validators.required],
  });

  protected novoEndereco(): void {
    this.editandoId.set(null);
    this.formulario.reset();
    this.abrirFormulario();
  }

  protected editar(endereco: Endereco): void {
    this.editandoId.set(endereco.id);
    this.formulario.setValue({
      cep: endereco.cep,
      logradouro: endereco.logradouro,
      numero: endereco.numero,
      complemento: endereco.complemento ?? '',
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      uf: endereco.uf,
    });
    this.abrirFormulario();
  }

  protected cancelar(): void {
    this.formularioAberto.set(false);
    this.editandoId.set(null);
  }

  protected salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valores = this.formulario.getRawValue();
    const dados: DadosEndereco = { ...valores, complemento: valores.complemento || null };
    const id = this.editandoId();
    const requisicao =
      id === null
        ? this.contaService.criarEndereco(dados)
        : this.contaService.atualizarEndereco(id, dados);
    this.salvando.set(true);
    this.erro.set(null);
    this.errosServidor.set({});
    requisicao.subscribe({
      next: () => {
        this.salvando.set(false);
        this.cancelar();
        this.enderecos.reload();
      },
      error: (falha: unknown) => {
        this.salvando.set(false);
        this.erro.set(mensagemDeErro(falha, 'Não foi possível salvar o endereço.'));
        this.errosServidor.set(camposComErro(falha));
      },
    });
  }

  protected remover(endereco: Endereco): void {
    if (!confirm(`Remover o endereço ${endereco.logradouro}, ${endereco.numero}?`)) {
      return;
    }
    this.contaService.removerEndereco(endereco.id).subscribe({
      next: () => this.enderecos.reload(),
      error: (falha: unknown) =>
        this.erro.set(mensagemDeErro(falha, 'Não foi possível remover o endereço.')),
    });
  }

  protected invalido(campo: CampoEndereco): boolean {
    const controle = this.formulario.controls[campo];
    return controle.invalid && controle.touched;
  }

  private abrirFormulario(): void {
    this.erro.set(null);
    this.errosServidor.set({});
    this.formularioAberto.set(true);
  }
}
