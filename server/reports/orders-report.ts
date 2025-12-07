/** Orders report */
import { orders, clients } from '@shared/schema';
import { db } from '../db';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { mapOrderFinancial } from './financial-mapper.ts';
import { filterByRoleOnResponse } from './role-guard.ts';
import { paginate } from './pagination.ts';
import type { ReportFilters, UserRole, OrderFinancial } from './types.ts';

export async function getOrdersReport(filters: ReportFilters, role: UserRole, userId?: string) {
  const conditions = [] as any[];
  if (role === 'client' && userId) conditions.push(eq(orders.clientId, userId));
  if (role === 'motoboy' && userId) conditions.push(eq(orders.motoboyId, userId));
  if (filters.startDate) conditions.push(gte(orders.createdAt, filters.startDate));
  if (filters.endDate) conditions.push(lte(orders.createdAt, filters.endDate));
  if (filters.status) conditions.push(sql`${orders.status} = ${filters.status}`);
  if (filters.paymentMethod) conditions.push(sql`${orders.formaPagamento} = ${filters.paymentMethod}`);
  if (filters.clientId && role === 'central') conditions.push(eq(orders.clientId, filters.clientId));
  if (filters.motoboyId && role === 'central') conditions.push(eq(orders.motoboyId, filters.motoboyId));

  const ordersData = await db.select().from(orders).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(orders.createdAt));
  const clientIds = [...new Set(ordersData.map(o => o.clientId))];
  const clientsData = clientIds.length ? await db.select().from(clients).where(sql`${clients.id} = ANY(${clientIds})`) : [];
  const clientsMap = new Map(clientsData.map(c => [c.id, c]));

  const ordersFinancial = ordersData.map(o => mapOrderFinancial(o, clientsMap.get(o.clientId)));
  const filteredOrders = filterByRoleOnResponse(ordersFinancial, role, userId) as OrderFinancial[];

  return paginate(filteredOrders, filters.page || 1, filters.limit || 50);
}
