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

  const conditions = [eq(orders.clientId, clientId)] as any[];
  if (filters.startDate) conditions.push(gte(orders.createdAt, filters.startDate));
  if (filters.endDate) conditions.push(lte(orders.createdAt, filters.endDate));
  if (filters.status) conditions.push(sql`${orders.status} = ${filters.status}`);
  if (filters.paymentMethod) conditions.push(sql`${orders.formaPagamento} = ${filters.paymentMethod}`);
  if (filters.motoboyId) conditions.push(sql`${orders.motoboyId} = ${filters.motoboyId}`);

  const ordersData = await db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt));
  const ordersFinancial = ordersData.map(o => mapOrderFinancial(o, client));
  const filteredOrders = filterByRoleOnResponse(ordersFinancial, role, userId) as OrderFinancial[];

  const stats = role === 'central'
    ? {
        totalOrders: ordersFinancial.length,
        totalRevenue: ordersFinancial.reduce((sum, o) => sum + o.totalCliente, 0),
        totalComissoes: ordersFinancial.reduce((sum, o) => sum + o.comissaoGuriri, 0),
      }
    : {
        totalOrders: ordersFinancial.length,
        totalPaid: ordersFinancial.reduce((sum, o) => sum + o.totalCliente, 0),
      };

  return {
    client: {
      id: client.id,
      name: client.name,
      hasMensalidade: parseFloat(client.mensalidade || '0') > 0,
    },
    period: { startDate: filters.startDate || null, endDate: filters.endDate || null },
    stats,
    orders: paginate(filteredOrders, filters.page || 1, filters.limit || 50),
  };
}
