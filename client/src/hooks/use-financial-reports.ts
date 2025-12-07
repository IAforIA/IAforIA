import { useMemo, useState } from "react";
import type { NormalizedOrder } from "@/types/orders";
import type {
  ClientFinancialSnapshot,
  FinanceFilters,
  FinancialSummary,
  MotoboyPayoutSnapshot,
} from "@/types/financial";
import {
  calculateFinancialSummary,
  filterDeliveredOrders,
  groupOrdersByClient,
  groupOrdersByMotoboy,
} from "@/services/financial";

const getTodayString = () => new Date().toISOString().split("T")[0];

interface UseFinancialReportsResult {
  finStartDate: FinanceFilters["dateStart"];
  finEndDate: FinanceFilters["dateEnd"];
  finMotoboyFilter: FinanceFilters["motoboyId"];
  finClientFilter: FinanceFilters["clientId"];
  setFinStartDate: (value: string) => void;
  setFinEndDate: (value: string) => void;
  handleFinMotoboyFilterChange: (value: string) => void;
  handleFinClientFilterChange: (value: string) => void;
  filteredDeliveredOrders: NormalizedOrder[];
  financialSummary: FinancialSummary;
  motoboySnapshots: MotoboyPayoutSnapshot[];
  clientSnapshots: ClientFinancialSnapshot[];
  deliveredTodayOrders: NormalizedOrder[];
  deliveredTodaySummary: FinancialSummary;
  pendingOrders: NormalizedOrder[];
  pendingSummary: FinancialSummary;
}

export function useFinancialReports(orders: NormalizedOrder[]): UseFinancialReportsResult {
  const [finStartDate, setFinStartDate] = useState<FinanceFilters["dateStart"]>(getTodayString);
  const [finEndDate, setFinEndDate] = useState<FinanceFilters["dateEnd"]>(getTodayString);
  const [finMotoboyFilter, setFinMotoboyFilter] = useState<FinanceFilters["motoboyId"]>("all");
  const [finClientFilter, setFinClientFilter] = useState<FinanceFilters["clientId"]>("all");

  const financeFilters = useMemo<FinanceFilters>(
    () => ({
      dateStart: finStartDate,
      dateEnd: finEndDate,
      motoboyId: finMotoboyFilter,
      clientId: finClientFilter,
    }),
    [finStartDate, finEndDate, finMotoboyFilter, finClientFilter],
  );

  const filteredDeliveredOrders = useMemo<NormalizedOrder[]>(
    () => filterDeliveredOrders(orders, financeFilters),
    [orders, financeFilters],
  );

  const financialSummary = useMemo<FinancialSummary>(
    () => calculateFinancialSummary(filteredDeliveredOrders),
    [filteredDeliveredOrders],
  );

  const motoboySnapshots = useMemo<MotoboyPayoutSnapshot[]>(
    () => groupOrdersByMotoboy(filteredDeliveredOrders),
    [filteredDeliveredOrders],
  );

  const clientSnapshots = useMemo<ClientFinancialSnapshot[]>(
    () => groupOrdersByClient(filteredDeliveredOrders),
    [filteredDeliveredOrders],
  );

  const deliveredTodayOrders = useMemo<NormalizedOrder[]>(
    () =>
      orders.filter(
        (order) =>
          order.status === "delivered" &&
          order.deliveredAtDate &&
          order.deliveredAtDate.toDateString() === new Date().toDateString(),
      ),
    [orders],
  );

  const deliveredTodaySummary = useMemo<FinancialSummary>(
    () => calculateFinancialSummary(deliveredTodayOrders),
    [deliveredTodayOrders],
  );

  const pendingOrders = useMemo<NormalizedOrder[]>(
    () => orders.filter((order) => order.status === "pending" || order.status === "in_progress"),
    [orders],
  );

  const pendingSummary = useMemo<FinancialSummary>(
    () => calculateFinancialSummary(pendingOrders),
    [pendingOrders],
  );

  return {
    finStartDate,
    finEndDate,
    finMotoboyFilter,
    finClientFilter,
    setFinStartDate,
    setFinEndDate,
    handleFinMotoboyFilterChange: (value) => setFinMotoboyFilter(value as FinanceFilters["motoboyId"]),
    handleFinClientFilterChange: (value) => setFinClientFilter(value as FinanceFilters["clientId"]),
    filteredDeliveredOrders,
    financialSummary,
    motoboySnapshots,
    clientSnapshots,
    deliveredTodayOrders,
    deliveredTodaySummary,
    pendingOrders,
    pendingSummary,
  };
}
