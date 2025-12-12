import type { NormalizedOrder, OrderFilters } from "@/types/orders";

const normalizeText = (value?: string | null) => value?.toLowerCase().trim() ?? "";

export function filterOrders(orders: NormalizedOrder[], filters: OrderFilters): NormalizedOrder[] {
  if (!orders.length) return [];

    const effectiveFilters = {
      status: filters.status ?? "all",
      clientId: filters.clientId ?? "all",
      motoboyId: filters.motoboyId ?? "all",
      paymentMethod: filters.paymentMethod ?? "all",
      date: filters.date ?? "",
      startDate: filters.startDate ?? "",
      endDate: filters.endDate ?? "",
      search: filters.search ?? "",
    };

    return orders.filter((order) => {
      if (effectiveFilters.status !== "all" && order.status !== effectiveFilters.status) return false;
      if (effectiveFilters.clientId !== "all" && order.clientId !== effectiveFilters.clientId) return false;
      if (effectiveFilters.motoboyId !== "all" && order.motoboyId !== effectiveFilters.motoboyId) return false;
      if (effectiveFilters.paymentMethod !== "all" && order.formaPagamento !== effectiveFilters.paymentMethod) return false;
      
      // Filtro por período: se startDate e endDate estiverem definidos, usa período
      if (effectiveFilters.startDate && effectiveFilters.endDate) {
        if (order.createdDateString < effectiveFilters.startDate || order.createdDateString > effectiveFilters.endDate) return false;
      } else if (effectiveFilters.date && order.createdDateString !== effectiveFilters.date) {
        // Fallback para data única se período não estiver definido
        return false;
      }

      if (effectiveFilters.search) {
        const search = effectiveFilters.search.toLowerCase();
      const matchesClient = normalizeText(order.clientName).includes(search);
      const matchesMotoboy = normalizeText(order.motoboyName).includes(search);
      const matchesOrigin = normalizeText(order.coletaBairro).includes(search);
      const matchesDest = normalizeText(order.entregaBairro).includes(search);
      if (!matchesClient && !matchesMotoboy && !matchesOrigin && !matchesDest) return false;
    }

    return true;
  });
}
