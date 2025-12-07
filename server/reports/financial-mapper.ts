/** Financial mapping for orders */
import { clients } from '@shared/schema';
import type { Order, Client } from '@shared/schema';
import * as FinancialEngine from '../financial-engine';
import type { OrderFinancial } from './types.ts';

export function mapOrderFinancial(order: Order, client?: Client | null): OrderFinancial {
  const hasMensalidade = client ? parseFloat(client.mensalidade || '0') > 0 : false;

  const valorProduto = order.produtoValorTotal ? parseFloat(order.produtoValorTotal.toString()) : 0;
  const valorEntrega = parseFloat(order.valor.toString());

  const transacao = FinancialEngine.calcularTransacao(valorProduto, valorEntrega, hasMensalidade);

  return {
    ...order,
    valorProduto: transacao.valorProduto,
    valorEntrega: transacao.valorEntrega,
    repasseMotoboy: transacao.repasseMotoboy,
    comissaoGuriri: transacao.comissaoGuriri,
    totalEstabelecimento: transacao.totalEstabelecimento,
    totalCliente: transacao.totalCliente,
    hasMensalidade,
  };
}
