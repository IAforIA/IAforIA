import { describe, expect, it } from "vitest";
import {
  calculateFinancialSummary,
  filterDeliveredOrders,
  groupOrdersByClient,
  groupOrdersByMotoboy,
} from "@/services/financial";
import type { FinanceFilters } from "@/types/financial";
import { createNormalizedOrder } from "@/test-utils/order-factories";

const baseFilters: FinanceFilters = {
  dateStart: "2024-01-01",
  dateEnd: "2024-12-31",
  motoboyId: "all",
  clientId: "all",
};

describe("financial services", () => {
  it("filters delivered orders respecting range and ids", () => {
    const delivered = createNormalizedOrder({
      id: "order-delivered",
      status: "delivered",
      clientId: "client-1",
      motoboyId: "motoboy-1",
      deliveredDateString: "2024-01-15",
      deliveredAtDate: new Date("2024-01-15T12:00:00Z"),
    });
    const outsideRange = createNormalizedOrder({
      id: "order-old",
      status: "delivered",
      deliveredDateString: "2023-12-01",
      deliveredAtDate: new Date("2023-12-01T12:00:00Z"),
    });
    const cancelled = createNormalizedOrder({ id: "order-cancelled", status: "cancelled" });

    const filters: FinanceFilters = {
      ...baseFilters,
      dateStart: "2024-01-10",
      dateEnd: "2024-01-31",
      clientId: "client-1",
      motoboyId: "motoboy-1",
    };

    const result = filterDeliveredOrders([delivered, outsideRange, cancelled], filters);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("order-delivered");
  });

  it("aggregates totals correctly", () => {
    const orders = [
      createNormalizedOrder({
        status: "delivered",
        freteValue: 12,
        produtoValue: 20,
        motoboyValue: 7,
        totalValue: 32,
      }),
      createNormalizedOrder({
        status: "delivered",
        freteValue: 8,
        produtoValue: 5,
        motoboyValue: 4,
        totalValue: 13,
      }),
    ];

    const summary = calculateFinancialSummary(orders);
    expect(summary.totalFrete).toBe(20);
    expect(summary.totalProduto).toBe(25);
    expect(summary.totalMotoboy).toBe(11);
    expect(summary.volumeTotal).toBe(45);
    expect(summary.lucroGuriri).toBe(9);
    expect(summary.totalOrders).toBe(2);
  });

  it("groups orders by motoboy in descending total", () => {
    const orders = [
      createNormalizedOrder({ id: "a", status: "delivered", motoboyId: "m1", motoboyName: "Ana", motoboyValue: 30 }),
      createNormalizedOrder({ id: "b", status: "delivered", motoboyId: "m1", motoboyName: "Ana", motoboyValue: 20 }),
      createNormalizedOrder({ id: "c", status: "delivered", motoboyId: "m2", motoboyName: "Bruno", motoboyValue: 15 }),
    ];

    const snapshots = groupOrdersByMotoboy(orders);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].motoboyId).toBe("m1");
    expect(snapshots[0].totalRepasse).toBe(50);
    expect(snapshots[1].motoboyId).toBe("m2");
  });

  it("groups orders by client with totals", () => {
    const orders = [
      createNormalizedOrder({ id: "d", status: "delivered", clientId: "c1", clientName: "Loja A", freteValue: 10, produtoValue: 5, totalValue: 15 }),
      createNormalizedOrder({ id: "e", status: "delivered", clientId: "c1", clientName: "Loja A", freteValue: 12, produtoValue: 3, totalValue: 15 }),
      createNormalizedOrder({ id: "f", status: "delivered", clientId: "c2", clientName: "Loja B", freteValue: 8, produtoValue: 2, totalValue: 10 }),
    ];

    const snapshots = groupOrdersByClient(orders);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].clientId).toBe("c1");
    expect(snapshots[0].totalFrete).toBe(22);
    expect(snapshots[0].totalProduto).toBe(8);
    expect(snapshots[0].totalMovimentado).toBe(30);
  });
});
