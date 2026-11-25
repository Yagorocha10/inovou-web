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
  imagemPrincipal: string | null;
  categoria: Categoria;
  disponivel: boolean;
}

export interface ProdutoDetalhe {
  id: number;
  nome: string;
  slug: string;
  descricao: string;
  preco: number;
  estoque: number;
  disponivel: boolean;
  categoria: Categoria;
  imagens: string[];
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
  pagina?: number;
  tamanho?: number;
}
