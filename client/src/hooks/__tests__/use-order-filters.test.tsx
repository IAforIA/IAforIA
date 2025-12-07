import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOrderFilters } from "@/hooks/use-order-filters";
import { createOrder } from "@/test-utils/order-factories";

const today = new Date("2024-01-10T12:00:00Z");

const sampleOrders = [
  createOrder({
    id: "order-1",
    status: "pending",
    createdAt: today,
    clientName: "Padaria Central",
    coletaBairro: "Centro",
    entregaBairro: "Zona Sul",
    motoboyName: "Carlos",
    motoboyId: "motoboy-1",
  }),
  createOrder({
    id: "order-2",
    status: "delivered",
    createdAt: today,
    deliveredAt: today,
    clientName: "Restaurante Vista",
    coletaBairro: "Jardins",
    entregaBairro: "Moema",
    motoboyName: "Joana",
    motoboyId: "motoboy-2",
  }),
];

describe("useOrderFilters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(today);
  });

  it("normalizes orders and exposes default filters", () => {
    const { result } = renderHook(() => useOrderFilters(sampleOrders));

    expect(result.current.normalizedOrders).toHaveLength(2);
    expect(result.current.filteredOrders).toHaveLength(2);
    expect(result.current.orderStatusFilter).toBe("all");
    expect(result.current.orderDateFilter).toBe("2024-01-10");
  });

  it("filters orders by status when handler changes", () => {
    const { result } = renderHook(() => useOrderFilters(sampleOrders));

    act(() => result.current.handleOrderStatusFilterChange("delivered"));

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].id).toBe("order-2");
  });

  it("filters orders by search input", () => {
    const { result } = renderHook(() => useOrderFilters(sampleOrders));

    act(() => result.current.setOrderSearchFilter("moema"));

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].id).toBe("order-2");
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
