import type { NormalizedOrder, OrderFilters } from "@/types/orders";

const normalizeText = (value?: string | null) => value?.toLowerCase().trim() ?? "";

export function filterOrders(orders: NormalizedOrder[], filters: OrderFilters): NormalizedOrder[] {
  if (!orders.length) return [];

  return orders.filter((order) => {
    if (filters.status !== "all" && order.status !== filters.status) return false;
    if (filters.clientId !== "all" && order.clientId !== filters.clientId) return false;
    if (filters.motoboyId !== "all" && order.motoboyId !== filters.motoboyId) return false;
    if (filters.paymentMethod !== "all" && order.formaPagamento !== filters.paymentMethod) return false;
    if (filters.date && order.createdDateString !== filters.date) return false;

    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesClient = normalizeText(order.clientName).includes(search);
      const matchesMotoboy = normalizeText(order.motoboyName).includes(search);
      const matchesOrigin = normalizeText(order.coletaBairro).includes(search);
      const matchesDest = normalizeText(order.entregaBairro).includes(search);
      if (!matchesClient && !matchesMotoboy && !matchesOrigin && !matchesDest) return false;
    }

    return true;
  });
}
