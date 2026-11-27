export interface Categoria {
  id: number;
  nome: string;
  slug: string;
}

export interface ProdutoResumo {
  id: number;
  nome: string;
  slug: string;
  preco: number;
  precoAnterior?: number | null;
  percentualDesconto?: number;
  precoPix?: number;
  imagemPrincipal: string | null;
  categoria: Categoria;
  disponivel: boolean;
  notaMedia?: number | null;
  totalAvaliacoes?: number;
}

export interface ProdutoDetalhe {
  id: number;
  nome: string;
  slug: string;
  descricao: string;
  preco: number;
  precoAnterior?: number | null;
  percentualDesconto?: number;
  precoPix?: number;
  estoque: number;
  disponivel: boolean;
  categoria: Categoria;
  imagens: string[];
  notaMedia?: number | null;
  totalAvaliacoes?: number;
}

export interface Pagina<T> {
  itens: T[];
  pagina: number;
  tamanho: number;
  totalItens: number;
  totalPaginas: number;
}

export type OrdenacaoProduto = 'MAIS_RECENTES' | 'MENOR_PRECO' | 'MAIOR_PRECO' | 'NOME';

export const ORDENACOES: { valor: OrdenacaoProduto; rotulo: string }[] = [
  { valor: 'MAIS_RECENTES', rotulo: 'Mais recentes' },
  { valor: 'MENOR_PRECO', rotulo: 'Menor preço' },
  { valor: 'MAIOR_PRECO', rotulo: 'Maior preço' },
  { valor: 'NOME', rotulo: 'Nome (A-Z)' },
];

export interface FiltroProdutos {
  busca?: string;
  categoria?: string;
  ordenacao?: OrdenacaoProduto;
  ofertas?: boolean;
  pagina?: number;
  tamanho?: number;
}

export interface Avaliacao {
  id: number;
  nota: number;
  comentario: string | null;
  autor: string;
  criadoEm: string;
}

export interface AvaliacoesDoProduto {
  media: number | null;
  total: number;
  avaliacoes: Pagina<Avaliacao>;
}

export interface PermissaoAvaliacao {
  podeAvaliar: boolean;
  motivo: string | null;
}

export interface Depoimento {
  nota: number;
  comentario: string;
  autor: string;
  produtoNome: string;
  produtoSlug: string;
  criadoEm: string;
}
