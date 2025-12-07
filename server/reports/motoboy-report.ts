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

  const stats = role === 'central'
    ? {
        totalOrders: ordersFinancial.length,
        totalRepasse: ordersFinancial.reduce((sum, o) => sum + o.repasseMotoboy, 0),
        totalRevenue: ordersFinancial.reduce((sum, o) => sum + o.totalCliente, 0),
      }
    : {
        totalOrders: ordersFinancial.length,
        totalEarnings: ordersFinancial.reduce((sum, o) => sum + o.repasseMotoboy, 0),
      };

  return {
    motoboy: {
      id: motoboy.id,
      name: motoboy.name,
    },
    period: { startDate: filters.startDate || null, endDate: filters.endDate || null },
    stats,
    orders: paginate(filteredOrders, filters.page || 1, filters.limit || 50),
  };
}
