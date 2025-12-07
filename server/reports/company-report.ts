/** Company (central-only) report */
import { orders, clients } from '@shared/schema';
import { db } from '../db';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { mapOrderFinancial } from './financial-mapper.ts';
import { paginate } from './pagination.ts';
import type { ReportFilters, UserRole, OrderFinancial } from './types.ts';

export async function getCompanyReport(filters: ReportFilters, role: UserRole) {
  if (role !== 'central') throw new Error('Acesso negado. Apenas central pode visualizar relatório global.');

  const conditions = [] as any[];
  if (filters.startDate) conditions.push(gte(orders.createdAt, filters.startDate));
  if (filters.endDate) conditions.push(lte(orders.createdAt, filters.endDate));
  if (filters.status) conditions.push(sql`${orders.status} = ${filters.status}`);
  if (filters.paymentMethod) conditions.push(sql`${orders.formaPagamento} = ${filters.paymentMethod}`);

  const ordersData = await db.select().from(orders).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(orders.createdAt));
  const clientsData = await db.select().from(clients);
  const clientsMap = new Map(clientsData.map(c => [c.id, c]));
  const ordersFinancial = ordersData.map(o => mapOrderFinancial(o, clientsMap.get(o.clientId)));

  const totalOrders = ordersFinancial.length;
  const totalRevenue = ordersFinancial.reduce((sum, o) => sum + o.totalCliente, 0);
  const totalComissoes = ordersFinancial.reduce((sum, o) => sum + o.comissaoGuriri, 0);
  const totalRepasses = ordersFinancial.reduce((sum, o) => sum + o.repasseMotoboy, 0);

  const breakdownByPayment = ordersFinancial.reduce((acc, o) => {
    const method = o.formaPagamento;
    if (!acc[method]) acc[method] = { count: 0, revenue: 0, comissao: 0 };
    acc[method].count++;
    acc[method].revenue += o.totalCliente;
    acc[method].comissao += o.comissaoGuriri;
    return acc;
  }, {} as Record<string, { count: number; revenue: number; comissao: number }>);

  const clientStats = ordersFinancial.reduce((acc, o) => {
    if (!acc[o.clientId]) acc[o.clientId] = { clientId: o.clientId, clientName: o.clientName, count: 0, revenue: 0 };
    acc[o.clientId].count++;
    acc[o.clientId].revenue += o.totalCliente;
    return acc;
  }, {} as Record<string, { clientId: string; clientName: string; count: number; revenue: number }>);

  const topClients = Object.values(clientStats).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const motoboyStats = ordersFinancial.filter(o => o.motoboyId).reduce((acc, o) => {
    const id = o.motoboyId!;
    if (!acc[id]) acc[id] = { motoboyId: id, motoboyName: o.motoboyName!, count: 0, totalRepasse: 0 };
    acc[id].count++;
    acc[id].totalRepasse += o.repasseMotoboy;
    return acc;
  }, {} as Record<string, { motoboyId: string; motoboyName: string; count: number; totalRepasse: number }>);

  const topMotoboys = Object.values(motoboyStats).sort((a, b) => b.count - a.count).slice(0, 10);

  return {
    period: { startDate: filters.startDate || null, endDate: filters.endDate || null },
    summary: {
      totalOrders,
      totalRevenue,
      totalComissoes,
      totalRepasses,
      averageOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
    },
    breakdownByPayment,
    topClients,
    topMotoboys,
    orders: paginate(ordersFinancial, filters.page || 1, filters.limit || 50),
  } satisfies Record<string, unknown | OrderFinancial | OrderFinancial[]>;
}
