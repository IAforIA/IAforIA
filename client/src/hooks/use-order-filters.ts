import { useMemo, useState } from "react";
import type { Order } from "@shared/schema";
import { normalizeOrders } from "@/adapters/order-adapter";
import { filterOrders } from "@/services/orders";
import type { NormalizedOrder, OrderFilters, OrderStatusFilter } from "@/types/orders";

interface UseOrderFiltersResult {
  normalizedOrders: NormalizedOrder[];
  filteredOrders: NormalizedOrder[];
  orderStatusFilter: OrderStatusFilter;
  orderClientFilter: OrderFilters["clientId"];
  orderMotoboyFilter: OrderFilters["motoboyId"];
  orderPaymentFilter: OrderFilters["paymentMethod"];
  orderDateFilter: OrderFilters["date"];
  orderSearchFilter: OrderFilters["search"];
  handleOrderStatusFilterChange: (value: string) => void;
  handleOrderClientFilterChange: (value: string) => void;
  handleOrderMotoboyFilterChange: (value: string) => void;
  handleOrderPaymentFilterChange: (value: string) => void;
  setOrderDateFilter: (value: string) => void;
  setOrderSearchFilter: (value: string) => void;
}

export function useOrderFilters(orders: Order[]): UseOrderFiltersResult {
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>("all");
  const [orderClientFilter, setOrderClientFilter] = useState<OrderFilters["clientId"]>("all");
  const [orderMotoboyFilter, setOrderMotoboyFilter] = useState<OrderFilters["motoboyId"]>("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<OrderFilters["paymentMethod"]>("all");
  const [orderDateFilter, setOrderDateFilter] = useState<OrderFilters["date"]>("");
  const [orderSearchFilter, setOrderSearchFilter] = useState<OrderFilters["search"]>("");

  const normalizedOrders = useMemo<NormalizedOrder[]>(() => normalizeOrders(orders), [orders]);

  const filters = useMemo<OrderFilters>(
    () => ({
      status: orderStatusFilter,
      clientId: orderClientFilter,
      motoboyId: orderMotoboyFilter,
      paymentMethod: orderPaymentFilter,
      date: orderDateFilter,
      search: orderSearchFilter,
    }),
    [orderStatusFilter, orderClientFilter, orderMotoboyFilter, orderPaymentFilter, orderDateFilter, orderSearchFilter],
  );

  const filteredOrders = useMemo<NormalizedOrder[]>(
    () => filterOrders(normalizedOrders, filters),
    [normalizedOrders, filters],
  );

  return {
    normalizedOrders,
    filteredOrders,
    orderStatusFilter,
    orderClientFilter,
    orderMotoboyFilter,
    orderPaymentFilter,
    orderDateFilter,
    orderSearchFilter,
    handleOrderStatusFilterChange: (value) => setOrderStatusFilter(value as OrderStatusFilter),
    handleOrderClientFilterChange: (value) => setOrderClientFilter(value as OrderFilters["clientId"]),
    handleOrderMotoboyFilterChange: (value) => setOrderMotoboyFilter(value as OrderFilters["motoboyId"]),
    handleOrderPaymentFilterChange: (value) => setOrderPaymentFilter(value as OrderFilters["paymentMethod"]),
    setOrderDateFilter,
    setOrderSearchFilter,
  };
}
