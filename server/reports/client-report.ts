/** Client report */
import { orders, clients } from '@shared/schema';
import { db } from '../db';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { mapOrderFinancial } from './financial-mapper.ts';
import { filterByRoleOnResponse } from './role-guard.ts';
import { paginate } from './pagination.ts';
import type { ReportFilters, UserRole, OrderFinancial } from './types.ts';

export async function getClientReport(clientId: string, filters: ReportFilters, role: UserRole, userId?: string) {
  if (role === 'motoboy') throw new Error('Acesso negado. Motoboy não pode visualizar dados de clientes.');
  if (role === 'client' && userId !== clientId) throw new Error('Acesso negado. Cliente só pode visualizar próprio relatório.');

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!client) throw new Error('Cliente não encontrado.');

  // Buscar todos os pedidos entregues do cliente (para stats gerais)
  const allOrdersConditions = [eq(orders.clientId, clientId), eq(orders.status, 'delivered')] as any[];
  const allDeliveredOrders = await db.select().from(orders).where(and(...allOrdersConditions));

  // Calcular totais
  const totalFaturamento = allDeliveredOrders.reduce((sum, o) => sum + parseFloat(o.valorProduto || '0') + parseFloat(o.freteValue || '0'), 0);
  const totalRepasse = allDeliveredOrders.reduce((sum, o) => sum + parseFloat(o.taxaMotoboy || '0'), 0);

  // Breakdown por método de pagamento
  const byPayment = {
    Dinheiro: {
      orders: allDeliveredOrders.filter(o => o.metodoPagamento === 'Dinheiro').length,
      revenue: allDeliveredOrders.filter(o => o.metodoPagamento === 'Dinheiro').reduce((sum, o) => sum + parseFloat(o.valorProduto || '0') + parseFloat(o.freteValue || '0'), 0),
    },
    Cartão: {
      orders: allDeliveredOrders.filter(o => o.metodoPagamento === 'Cartão').length,
      revenue: allDeliveredOrders.filter(o => o.metodoPagamento === 'Cartão').reduce((sum, o) => sum + parseFloat(o.valorProduto || '0') + parseFloat(o.freteValue || '0'), 0),
    },
    Pix: {
      orders: allDeliveredOrders.filter(o => o.metodoPagamento === 'Pix').length,
      revenue: allDeliveredOrders.filter(o => o.metodoPagamento === 'Pix').reduce((sum, o) => sum + parseFloat(o.valorProduto || '0') + parseFloat(o.freteValue || '0'), 0),
    },
  };

  // Aplicar filtros para a lista de pedidos
  const conditions = [eq(orders.clientId, clientId)] as any[];
  if (filters.startDate) conditions.push(gte(orders.createdAt, filters.startDate));
  if (filters.endDate) conditions.push(lte(orders.createdAt, filters.endDate));
  if (filters.status) conditions.push(sql`${orders.status} = ${filters.status}`);
  if (filters.paymentMethod) conditions.push(sql`${orders.formaPagamento} = ${filters.paymentMethod}`);
  if (filters.motoboyId) conditions.push(sql`${orders.motoboyId} = ${filters.motoboyId}`);

  const ordersData = await db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt));
  const ordersFinancial = ordersData.map(o => mapOrderFinancial(o, client));
  const filteredOrders = filterByRoleOnResponse(ordersFinancial, role, userId) as OrderFinancial[];

  // Formato esperado pelo frontend (interface ClientReport em types.ts)
  return {
    client: {
      id: client.id,
      name: client.name,
      hasMensalidade: parseFloat(client.mensalidade || '0') > 0,
    },
    period: { startDate: filters.startDate || null, endDate: filters.endDate || null },
    stats: {
      totalOrders: allDeliveredOrders.length,
      totalFaturamento,
      totalRepasse,
      // Mantém os antigos para compatibilidade com central
      totalRevenue: totalFaturamento,
      totalComissoes: totalRepasse,
      totalPaid: totalFaturamento,
    },
    breakdown: {
      byPayment,
    },
    orders: paginate(filteredOrders, filters.page || 1, filters.limit || 50),
  };
}
