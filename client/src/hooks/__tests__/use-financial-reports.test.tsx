import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFinancialReports } from "@/hooks/use-financial-reports";
import { createNormalizedOrder } from "@/test-utils/order-factories";

const today = new Date("2024-01-10T12:00:00Z");

const normalizedOrders = [
  createNormalizedOrder({
    id: "delivered-1",
    status: "delivered",
    clientId: "client-1",
    clientName: "Loja Norte",
    motoboyId: "motoboy-1",
    motoboyName: "Ana",
    freteValue: 12,
    produtoValue: 8,
    totalValue: 20,
    motoboyValue: 7,
    deliveredAt: today,
    deliveredAtDate: today,
    deliveredDateString: "2024-01-10",
  }),
  createNormalizedOrder({
    id: "delivered-2",
    status: "delivered",
    clientId: "client-2",
    clientName: "Loja Sul",
    motoboyId: "motoboy-2",
    motoboyName: "Bruno",
    freteValue: 15,
    produtoValue: 5,
    totalValue: 20,
    motoboyValue: 6,
    deliveredAt: today,
    deliveredAtDate: today,
    deliveredDateString: "2024-01-10",
  }),
  createNormalizedOrder({
    id: "pending-1",
    status: "pending",
    motoboyId: "motoboy-1",
    clientId: "client-1",
  }),
];

describe("useFinancialReports", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(today);
  });

  it("builds default summary from delivered orders", () => {
    const { result } = renderHook(() => useFinancialReports(normalizedOrders));

    expect(result.current.filteredDeliveredOrders).toHaveLength(2);
    expect(result.current.financialSummary.totalFrete).toBe(27);
    expect(result.current.financialSummary.totalProduto).toBe(13);
    expect(result.current.financialSummary.totalMotoboy).toBe(13);
    expect(result.current.deliveredTodayOrders).toHaveLength(2);
    expect(result.current.pendingOrders).toHaveLength(1);
  });

  it("filters delivered orders by motoboy", () => {
    const { result } = renderHook(() => useFinancialReports(normalizedOrders));

    act(() => result.current.handleFinMotoboyFilterChange("motoboy-2"));

    expect(result.current.filteredDeliveredOrders).toHaveLength(1);
    expect(result.current.filteredDeliveredOrders[0].motoboyId).toBe("motoboy-2");
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
