import type { Order } from "@shared/schema";
import type { NormalizedOrder } from "@/types/orders";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function toDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toDateString(date?: Date): string | undefined {
  if (!date) return undefined;
  return date.toISOString().split("T")[0];
}

export function normalizeOrder(order: Order): NormalizedOrder {
  const freteValue = toNumber(order.valor);
  const produtoValue = toNumber(order.produtoValorTotal);
  const motoboyValue = toNumber(order.taxaMotoboy);
  const createdAtDate = toDate(order.createdAt) ?? new Date();
  const deliveredAtDate = toDate(order.deliveredAt ?? undefined);

  return {
    ...order,
    freteValue,
    produtoValue,
    totalValue: freteValue + produtoValue,
    motoboyValue,
    createdAtDate,
    createdDateString: toDateString(createdAtDate) ?? "",
    deliveredAtDate,
    deliveredDateString: toDateString(deliveredAtDate),
  };
}

export function normalizeOrders(orders: Order[]): NormalizedOrder[] {
  return orders.map(normalizeOrder);
}
