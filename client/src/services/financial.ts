import type { NormalizedOrder } from "@/types/orders";
import type {
  ClientFinancialSnapshot,
  FinanceFilters,
  FinancialSummary,
  MotoboyPayoutSnapshot,
} from "@/types/financial";

const withinRange = (date: string | undefined, start: string, end: string) => {
  if (!start && !end) return true;
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};

const matchesFinanceFilters = (order: NormalizedOrder, filters: FinanceFilters) => {
  const referenceDate = order.deliveredDateString ?? order.createdDateString;
  if (!withinRange(referenceDate, filters.dateStart, filters.dateEnd)) return false;
  if (filters.motoboyId !== "all" && order.motoboyId !== filters.motoboyId) return false;
  if (filters.clientId !== "all" && order.clientId !== filters.clientId) return false;
  return true;
};

export function filterDeliveredOrders(
  orders: NormalizedOrder[],
  filters: FinanceFilters,
): NormalizedOrder[] {
  return orders
    .filter((order) => order.status === "delivered")
    .filter((order) => matchesFinanceFilters(order, filters))
    .sort((a, b) => {
      const aTime = a.deliveredAtDate?.getTime() ?? a.createdAtDate.getTime();
      const bTime = b.deliveredAtDate?.getTime() ?? b.createdAtDate.getTime();
      return bTime - aTime;
    });
}

export function calculateFinancialSummary(orders: NormalizedOrder[]): FinancialSummary {
  return orders.reduce<FinancialSummary>(
    (acc, order) => {
      acc.totalFrete += order.freteValue;
      acc.totalProduto += order.produtoValue;
      acc.totalMotoboy += order.motoboyValue;
      acc.volumeTotal += order.totalValue;
      acc.lucroGuriri += order.freteValue - order.motoboyValue;
      acc.totalOrders += 1;
      return acc;
    },
    {
      totalFrete: 0,
      totalProduto: 0,
      totalMotoboy: 0,
      volumeTotal: 0,
      lucroGuriri: 0,
      totalOrders: 0,
    },
  );
}

export function groupOrdersByMotoboy(orders: NormalizedOrder[]): MotoboyPayoutSnapshot[] {
  const grouped = orders.reduce<Record<string, MotoboyPayoutSnapshot>>((acc, order) => {
    if (!order.motoboyId) return acc;
    if (!acc[order.motoboyId]) {
      acc[order.motoboyId] = {
        motoboyId: order.motoboyId,
        motoboyName: order.motoboyName ?? "Desconhecido",
        orders: [],
        totalRepasse: 0,
      };
    }
    acc[order.motoboyId].orders.push(order);
    acc[order.motoboyId].totalRepasse += order.motoboyValue;
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => b.totalRepasse - a.totalRepasse);
}

export function groupOrdersByClient(orders: NormalizedOrder[]): ClientFinancialSnapshot[] {
  const grouped = orders.reduce<Record<string, ClientFinancialSnapshot>>((acc, order) => {
    if (!order.clientId) return acc;
    if (!acc[order.clientId]) {
      acc[order.clientId] = {
        clientId: order.clientId,
        clientName: order.clientName ?? "Desconhecido",
        orders: [],
        totalFrete: 0,
        totalProduto: 0,
        totalMovimentado: 0,
      };
    }
    acc[order.clientId].orders.push(order);
    acc[order.clientId].totalFrete += order.freteValue;
    acc[order.clientId].totalProduto += order.produtoValue;
    acc[order.clientId].totalMovimentado += order.totalValue;
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => b.totalMovimentado - a.totalMovimentado);
}
