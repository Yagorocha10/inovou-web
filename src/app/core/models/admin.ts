import { Categoria, Pagina } from './catalogo';
import { FormaPagamento, Pedido, PedidoResumo, StatusPedido } from './pedido';

export type SituacaoProduto = 'TODOS' | 'ATIVOS' | 'INATIVOS';

export interface ImagemAdmin {
  id: number;
  url: string;
  ordem: number;
}

export interface ProdutoAdmin {
  id: number;
  nome: string;
  slug: string;
  descricao: string;
  preco: number;
  estoque: number;
  ativo: boolean;
  categoria: Categoria;
  imagens: ImagemAdmin[];
}

export interface DadosProduto {
  nome: string;
  descricao: string;
  preco: number;
  estoque: number;
  categoriaId: number;
  ativo: boolean;
}

export interface FiltroProdutosAdmin {
  busca?: string;
  categoriaId?: number;
  situacao?: SituacaoProduto;
  ativo?: boolean;
  pagina?: number;
  tamanho?: number;
}

export interface FiltroPedidosAdmin {
  busca?: string;
  status?: StatusPedido;
  pagina?: number;
  tamanho?: number;
}

export interface ClientePedido {
  id: number;
  nome: string;
  email: string;
}

export interface PedidoAdminResumo extends PedidoResumo {
  cliente: ClientePedido;
  formaPagamento: FormaPagamento;
}

export interface PedidoAdmin extends Pedido {
  cliente: ClientePedido;
  proximosStatus: StatusPedido[];
}

export interface ResumoAdmin {
  pedidosHoje: number;
  faturamentoHoje: number;
  pedidosParaPreparar: number;
  produtosSemEstoque: number;
  ultimosPedidos: PedidoAdminResumo[];
}

export type PaginaProdutosAdmin = Pagina<ProdutoAdmin>;
export type PaginaPedidosAdmin = Pagina<PedidoAdminResumo>;

