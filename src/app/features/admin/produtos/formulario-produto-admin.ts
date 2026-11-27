import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

export type FormularioProdutoAdmin = {
  nome: FormControl<string>;
  descricao: FormControl<string>;
  preco: FormControl<number | null>;
  precoAnterior: FormControl<number | null>;
  estoque: FormControl<number | null>;
  categoriaId: FormControl<number | null>;
  ativo: FormControl<boolean>;
};

const PRECO_COM_ATE_DUAS_CASAS = /^\d+(\.\d{1,2})?$/;
const ESTOQUE_INTEIRO = /^\d+$/;

export function textoObrigatorioSemEspacos(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim() ? null : { required: true };
}

export function criarFormularioProdutoAdmin(
  validarCategoria: ValidatorFn,
): FormGroup<FormularioProdutoAdmin> {
  return new FormGroup<FormularioProdutoAdmin>({
    nome: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, textoObrigatorioSemEspacos, Validators.maxLength(150)],
    }),
    descricao: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2000)],
    }),
    preco: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.pattern(PRECO_COM_ATE_DUAS_CASAS),
    ]),
    precoAnterior: new FormControl<number | null>(null, [
      Validators.min(0.01),
      Validators.pattern(PRECO_COM_ATE_DUAS_CASAS),
    ]),
    estoque: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.pattern(ESTOQUE_INTEIRO),
    ]),
    categoriaId: new FormControl<number | null>(null, [Validators.required, validarCategoria]),
    ativo: new FormControl(true, { nonNullable: true }),
  });
}

export function comPrecoAnterior<T extends object>(
  dados: T,
  precoAnterior: number | null | undefined,
): T & { precoAnterior?: number } {
  return precoAnterior === null || precoAnterior === undefined ? dados : { ...dados, precoAnterior };
}
