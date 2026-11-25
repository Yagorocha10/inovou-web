import { HttpErrorResponse } from '@angular/common/http';

interface CorpoErro {
  mensagem?: string;
  campos?: Record<string, string>;
}

export function mensagemDeErro(erro: unknown, padrao: string): string {
  if (erro instanceof HttpErrorResponse) {
    if (erro.status === 0) {
      return 'Não foi possível falar com o servidor. Tente de novo em instantes.';
    }
    const corpo = erro.error as CorpoErro | null;
    if (corpo?.mensagem) {
      return corpo.mensagem;
    }
  }
  return padrao;
}

export function camposComErro(erro: unknown): Record<string, string> {
  if (erro instanceof HttpErrorResponse) {
    return (erro.error as CorpoErro | null)?.campos ?? {};
  }
  return {};
}

export function retornoSeguro(url: string | null | undefined, padrao = '/'): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : padrao;
}
