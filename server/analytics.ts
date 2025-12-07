/**
 * ANALYTICS MODULE
 * 
 * Core business logic for financial calculations and reporting
 * Used by REST API endpoints to provide real-time business intelligence
 * 
 * IMPORTANTE: Este módulo agora delega TODA a lógica financeira para financial-engine.ts
 * Mantido apenas para compatibilidade com código existente.
 */

import { db } from './db';
import { orders, clients, motoboys } from '@shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import * as FinancialEngine from './financial-engine';

// ============================================================================
// FUNÇÕES DE COMPATIBILIDADE (usam financial-engine internamente)
// ============================================================================

/**
 * Calcula a comissão da Guriri Express
 * 
 * @deprecated Use FinancialEngine.calcularTransacao() diretamente para cálculos completos
 * Mantido para compatibilidade com código existente
 */
export function calculateGuririComission(valor: number, hasMensalidade: boolean): { motoboy: number; guriri: number } {
  const valorInteiro = Math.round(valor);
  return {
    motoboy: FinancialEngine.calcularRepasseMotoboy(valorInteiro),
    guriri: FinancialEngine.calcularComissaoGuriri(valorInteiro, hasMensalidade),
  };
}

/**
 * Valida se um valor de entrega é permitido
 * 
 * @deprecated Use FinancialEngine.isValorEntregaValido() diretamente
 * Mantido para compatibilidade com código existente
 */
export function isValidDeliveryValue(valor: number, hasMensalidade: boolean): boolean {
  return FinancialEngine.isValorEntregaValido(Math.round(valor), hasMensalidade);
}

/**
 * Retorna os valores permitidos para um cliente
 * 
 * @deprecated Use FinancialEngine.getValoresPermitidos() diretamente
 * Mantido para compatibilidade com código existente
 */
export function getAllowedValues(hasMensalidade: boolean): number[] {
  return FinancialEngine.getValoresPermitidos(hasMensalidade);
}

// ============================================================================
// TYPES
// ============================================================================

export interface RevenueData {
  totalRevenue: number;      // SUM(valor) WHERE status='delivered'
  motoboysCost: number;       // SUM(taxa_motoboy) WHERE status='delivered'
  profit: number;             // totalRevenue - motoboysCost
  margin: number;             // (profit / totalRevenue) * 100
  ordersCount: number;
}

export interface MotoboyEarnings {
  deliveries: number;
  totalEarnings: number;
  avgPerDelivery: number;
}

export interface ClientDebtData {
  clientId: string;
  month: string;
  ordersCount: number;
  totalSpent: number;
  mensalidadeDue: number;
  balance: number;
  status: 'ok' | 'overdue';
}

export interface DashboardKPIs {
  todayRevenue: number;
  todayProfit: number;
  monthToDateRevenue: number;
  monthToDateProfit: number;
  mrr: number;
  activeDriversCount: number;
  pendingOrdersCount: number;
  pendingOrdersValue: number;
}

// ============================================================================
// REVENUE CALCULATIONS
// ============================================================================

/**
 * Calculate revenue for a specific date
 * Includes delivered orders only
 * 
 * LÓGICA FINANCEIRA CORRIGIDA:
 * - totalRevenue = SOMA(valor do frete + valor do produto) de pedidos entregues
 * - motoboysCost = SOMA(taxaMotoboy) - o que o motoboy recebe
 * - profit = totalRevenue - motoboysCost - lucro da Guriri
 */
export async function getDailyRevenue(date: Date): Promise<RevenueData> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const result = await db
    .select({
      valorFrete: sql<number>`COALESCE(SUM(CAST(${orders.valor} AS DECIMAL)), 0)`,
      valorProduto: sql<number>`COALESCE(SUM(CAST(${orders.produtoValorTotal} AS DECIMAL)), 0)`,
      motoboysCost: sql<number>`COALESCE(SUM(CAST(${orders.taxaMotoboy} AS DECIMAL)), 0)`,
      ordersCount: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, 'delivered'),
        gte(orders.deliveredAt, startOfDay),
        lte(orders.deliveredAt, endOfDay)
      )
    );
  
  const data = result[0] || { valorFrete: 0, valorProduto: 0, motoboysCost: 0, ordersCount: 0 };
  
  // TOTAL REVENUE = Frete + Produto (valor total cobrado do destinatário)
  const totalRevenue = Number(data.valorFrete) + Number(data.valorProduto);
  const motoboysCost = Number(data.motoboysCost);
  
  // Profit = apenas do frete (produto não gera lucro para Guriri)
  const profit = Number(data.valorFrete) - motoboysCost;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  
  return {
    totalRevenue,
    motoboysCost,
    ordersCount: Number(data.ordersCount),
    profit,
    margin,
  };
}

/**
 * Calculate revenue for a date range
 */
export async function getRevenueByDateRange(startDate: Date, endDate: Date): Promise<RevenueData> {
  const result = await db
    .select({
      valorFrete: sql<number>`COALESCE(SUM(CAST(${orders.valor} AS DECIMAL)), 0)`,
      valorProduto: sql<number>`COALESCE(SUM(CAST(${orders.produtoValorTotal} AS DECIMAL)), 0)`,
      motoboysCost: sql<number>`COALESCE(SUM(CAST(${orders.taxaMotoboy} AS DECIMAL)), 0)`,
      ordersCount: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, 'delivered'),
        gte(orders.deliveredAt, startDate),
        lte(orders.deliveredAt, endDate)
      )
    );
  
  const data = result[0] || { valorFrete: 0, valorProduto: 0, motoboysCost: 0, ordersCount: 0 };
  
  // TOTAL REVENUE = Frete + Produto
  const totalRevenue = Number(data.valorFrete) + Number(data.valorProduto);
  const motoboysCost = Number(data.motoboysCost);
  
  // Profit = apenas do frete
  const profit = Number(data.valorFrete) - motoboysCost;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  
  return {
    totalRevenue,
    motoboysCost,
    ordersCount: Number(data.ordersCount),
    profit,
    margin,
  };
}

// ============================================================================
// MOTOBOY EARNINGS
// ============================================================================

/**
 * Calculate earnings for a specific motoboy in a date range
 */
export async function getMotoboyEarnings(
  motoboyId: string,
  startDate: Date,
  endDate: Date
): Promise<MotoboyEarnings> {
  const result = await db
    .select({
      deliveries: sql<number>`COUNT(*)`,
      totalEarnings: sql<number>`COALESCE(SUM(CAST(${orders.taxaMotoboy} AS DECIMAL)), 0)`,
      avgPerDelivery: sql<number>`COALESCE(AVG(CAST(${orders.taxaMotoboy} AS DECIMAL)), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.motoboyId, motoboyId),
        eq(orders.status, 'delivered'),
        gte(orders.deliveredAt, startDate),
        lte(orders.deliveredAt, endDate)
      )
    );
  
  const data = result[0] || { deliveries: 0, totalEarnings: 0, avgPerDelivery: 0 };
  
  return {
    deliveries: Number(data.deliveries),
    totalEarnings: Number(data.totalEarnings),
    avgPerDelivery: Number(data.avgPerDelivery),
  };
}

// ============================================================================
// CLIENT BILLING & DEBT
// ============================================================================

/**
 * Calculate client debt/balance for a specific month
 * Balance = mensalidade - totalSpent
 * Negative balance means client owes money (spent more than subscription)
 */
export async function getClientDebt(clientId: string, month: string): Promise<ClientDebtData> {
  // month format: 'YYYY-MM'
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
  
  // Get client mensalidade
  const clientData = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  
  const mensalidade = clientData[0]?.mensalidade 
    ? parseFloat(clientData[0].mensalidade as any) 
    : 0;
  
  // Get orders for the month
  const ordersData = await db
    .select({
      count: sql<number>`COUNT(*)`,
      total: sql<number>`COALESCE(SUM(CAST(${orders.valor} AS DECIMAL)), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.clientId, clientId),
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      )
    );
  
  const ordersCount = Number(ordersData[0]?.count || 0);
  const totalSpent = Number(ordersData[0]?.total || 0);
  
  // Balance calculation: mensalidade - totalSpent
  // Negative = client owes us (they spent more than their subscription)
  const balance = mensalidade - totalSpent;
  
  return {
    clientId,
    month,
    ordersCount,
    totalSpent,
    mensalidadeDue: mensalidade,
    balance,
    status: balance < 0 ? 'overdue' : 'ok',
  };
}

// ============================================================================
// MONTHLY RECURRING REVENUE
// ============================================================================

/**
 * Calculate total Monthly Recurring Revenue from all active clients
 */
export async function getMonthlyRecurringRevenue(): Promise<number> {
  const result = await db
    .select({
      mrr: sql<number>`COALESCE(SUM(CAST(${clients.mensalidade} AS DECIMAL)), 0)`,
    })
    .from(clients)
    .where(sql`CAST(${clients.mensalidade} AS DECIMAL) > 0`);
  
  return Number(result[0]?.mrr || 0);
}

// ============================================================================
// DASHBOARD KPIs
// ============================================================================

/**
 * Get all key performance indicators for central dashboard
 * Optimized to run in a single pass
 */
export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  
  // Get today's revenue
  const todayRevenue = await getDailyRevenue(today);
  
  // Get month-to-date revenue
  const mtdRevenue = await getRevenueByDateRange(startOfMonth, endOfMonth);
  
  // Get MRR
  const mrr = await getMonthlyRecurringRevenue();
  
  // Get active drivers count
  const activeDrivers = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(motoboys)
    .where(eq(motoboys.online, true));
  
  // Get pending orders stats (CORRIGIDO: inclui valor do produto)
  const pendingOrders = await db
    .select({
      count: sql<number>`COUNT(*)`,
      valorFrete: sql<number>`COALESCE(SUM(CAST(${orders.valor} AS DECIMAL)), 0)`,
      valorProduto: sql<number>`COALESCE(SUM(CAST(${orders.produtoValorTotal} AS DECIMAL)), 0)`,
    })
    .from(orders)
    .where(eq(orders.status, 'pending'));
  
  const pendingData = pendingOrders[0] || { count: 0, valorFrete: 0, valorProduto: 0 };
  const pendingTotalValue = Number(pendingData.valorFrete) + Number(pendingData.valorProduto);
  
  return {
    todayRevenue: todayRevenue.totalRevenue,
    todayProfit: todayRevenue.profit,
    monthToDateRevenue: mtdRevenue.totalRevenue,
    monthToDateProfit: mtdRevenue.profit,
    mrr,
    activeDriversCount: Number(activeDrivers[0]?.count || 0),
    pendingOrdersCount: Number(pendingData.count),
    pendingOrdersValue: pendingTotalValue,
  };
}
