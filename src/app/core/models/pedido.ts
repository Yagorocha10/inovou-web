export type FormaPagamento = 'PIX' | 'CARTAO' | 'NA_ENTREGA';

export type StatusPedido =
  'AGUARDANDO_PAGAMENTO' | 'PAGO' | 'EM_SEPARACAO' | 'SAIU_PARA_ENTREGA' | 'ENTREGUE' | 'CANCELADO';

export interface NovoPedido {
  enderecoId: number;
  formaPagamento: FormaPagamento;
}

export interface ItemPedido {
  produtoId: number;
  nome: string;
  slug: string;
  imagem: string | null;
  precoUnitario: number;
  quantidade: number;
  subtotal: number;
}

export interface EnderecoEntregaPedido {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface PagamentoPedido {
  forma: FormaPagamento;
  instrucoes: string;
  codigoPix: string | null;
}

export interface ResumoCheckout {
  itens: ItemPedido[];
  subtotal: number;
  frete: number;
  total: number;
  descontoPix?: number;
  totalPix?: number;
  prazoEntregaDias: number;
  endereco: EnderecoEntregaPedido;
}

export interface Pedido {
  id: number;
  codigo: string;
  status: StatusPedido;
  criadoEm: string;
  itens: ItemPedido[];
  subtotal: number;
  frete: number;
  desconto?: number;
  total: number;
  endereco: EnderecoEntregaPedido;
  pagamento: PagamentoPedido;
  podeCancelar: boolean;
}

export interface PedidoResumo {
  id: number;
  codigo: string;
  status: StatusPedido;
  criadoEm: string;
  quantidadeItens: number;
  total: number;
}

export const ROTULOS_STATUS_PEDIDO: Record<StatusPedido, string> = {
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGO: 'Pago',
  EM_SEPARACAO: 'Em separação',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export const ROTULOS_FORMAS_PAGAMENTO: Record<FormaPagamento, string> = {
  PIX: 'Pix',
  CARTAO: 'Cartão',
  NA_ENTREGA: 'Pagar na entrega',
};
