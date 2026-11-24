export type Role = 'CLIENTE' | 'ADMIN';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: Role;
}

export interface Sessao {
  token: string;
  expiraEm: string;
  usuario: Usuario;
}

export interface DadosCadastro {
  nome: string;
  email: string;
  senha: string;
}

export interface Endereco {
  id: number;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
}

export type DadosEndereco = Omit<Endereco, 'id'>;

export const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];
