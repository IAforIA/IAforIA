/** Motoboy report */
import { orders, motoboys, clients } from '@shared/schema';
import { db } from '../db';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { mapOrderFinancial } from './financial-mapper.ts';
import { filterByRoleOnResponse } from './role-guard.ts';
import { paginate } from './pagination.ts';
import type { ReportFilters, UserRole, OrderFinancial } from './types.ts';

export async function getMotoboyReport(motoboyId: string, filters: ReportFilters, role: UserRole, userId?: string) {
  if (role === 'client') throw new Error('Acesso negado. Cliente não pode visualizar dados de motoboys.');
  if (role === 'motoboy' && userId !== motoboyId) throw new Error('Acesso negado. Motoboy só pode visualizar próprio relatório.');

  const [motoboy] = await db.select().from(motoboys).where(eq(motoboys.id, motoboyId));
  if (!motoboy) throw new Error('Motoboy não encontrado.');

  // Buscar todas as entregas do motoboy (sem filtro de data para stats gerais)
  const allOrdersConditions = [eq(orders.motoboyId, motoboyId), eq(orders.status, 'delivered')] as any[];
  const allDeliveredOrders = await db.select().from(orders).where(and(...allOrdersConditions));

  // Calcular ganhos semanais (últimos 7 dias)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyOrders = allDeliveredOrders.filter(o => new Date(o.createdAt) >= oneWeekAgo);
  const ganhosSemanais = weeklyOrders.reduce((sum, o) => sum + parseFloat(o.taxaMotoboy || '0'), 0);

  // Calcular ganhos mensais (últimos 30 dias)
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const monthlyOrders = allDeliveredOrders.filter(o => new Date(o.createdAt) >= oneMonthAgo);
  const ganhosMensais = monthlyOrders.reduce((sum, o) => sum + parseFloat(o.taxaMotoboy || '0'), 0);

  // Breakdown por método de pagamento
  const byPayment = {
    Dinheiro: allDeliveredOrders.filter(o => o.metodoPagamento === 'Dinheiro').length,
    Cartão: allDeliveredOrders.filter(o => o.metodoPagamento === 'Cartão').length,
    Pix: allDeliveredOrders.filter(o => o.metodoPagamento === 'Pix').length,
  };

  // Aplicar filtros para a lista de pedidos
  const conditions = [eq(orders.motoboyId, motoboyId)] as any[];
  if (filters.startDate) conditions.push(gte(orders.createdAt, filters.startDate));
  if (filters.endDate) conditions.push(lte(orders.createdAt, filters.endDate));
  if (filters.status) conditions.push(sql`${orders.status} = ${filters.status}`);

  const ordersData = await db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt));
  const clientIds = [...new Set(ordersData.map(o => o.clientId))];
  const clientsData = clientIds.length ? await db.select().from(clients).where(sql`${clients.id} = ANY(${clientIds})`) : [];
  const clientsMap = new Map(clientsData.map(c => [c.id, c]));

  const ordersFinancial = ordersData.map(o => mapOrderFinancial(o, clientsMap.get(o.clientId)));
  const filteredOrders = filterByRoleOnResponse(ordersFinancial, role, userId) as OrderFinancial[];

  // Formato esperado pelo frontend (interface MotoboyReport em types.ts)
  return {
    motoboy: {
      id: motoboy.id,
      name: motoboy.name,
    },
    period: { startDate: filters.startDate || null, endDate: filters.endDate || null },
    stats: {
      totalEntregas: allDeliveredOrders.length,
      ganhosSemanais,
      ganhosMensais,
      // Mantém os antigos para compatibilidade com central
      totalOrders: ordersFinancial.length,
      totalEarnings: ganhosMensais,
      totalRepasse: ganhosMensais,
      totalRevenue: ordersFinancial.reduce((sum, o) => sum + o.totalCliente, 0),
    },
    breakdown: {
      byPayment,
    },
    orders: paginate(filteredOrders, filters.page || 1, filters.limit || 50),
  };
}
