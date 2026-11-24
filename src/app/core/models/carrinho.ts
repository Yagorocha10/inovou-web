export interface ItemCarrinho {
  produtoId: number;
  nome: string;
  slug: string;
  imagem: string | null;
  precoUnitario: number;
  quantidade: number;
  subtotal: number;
  estoqueDisponivel: number;
  disponivel: boolean;
}

export interface Carrinho {
  itens: ItemCarrinho[];
  quantidadeTotal: number;
  subtotal: number;
  podeFinalizar: boolean;
}
