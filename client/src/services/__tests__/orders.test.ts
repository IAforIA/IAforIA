import { describe, expect, it } from "vitest";
import { filterOrders } from "@/services/orders";
import type { OrderFilters } from "@/types/orders";
import { createNormalizedOrder } from "@/test-utils/order-factories";

const baseFilters: OrderFilters = {
  status: "all",
  clientId: "all",
  motoboyId: "all",
  date: "",
  search: "",
};

describe("filterOrders", () => {
  it("returns every order when filters are neutral", () => {
    const orders = [
      createNormalizedOrder({ id: "order-1", status: "pending" }),
      createNormalizedOrder({ id: "order-2", status: "delivered" }),
    ];

    const result = filterOrders(orders, baseFilters);

    expect(result.map((order) => order.id)).toEqual(["order-1", "order-2"]);
  });

  it("filters by status, client, motoboy and date", () => {
    const delivered = createNormalizedOrder({
      id: "order-3",
      status: "delivered",
      clientId: "client-allowed",
      motoboyId: "motoboy-allowed",
      createdDateString: "2024-01-10",
      createdAtDate: new Date("2024-01-10T09:00:00Z"),
    });
    const pending = createNormalizedOrder({
      id: "order-4",
      status: "pending",
      clientId: "client-blocked",
      motoboyId: "motoboy-blocked",
      createdDateString: "2024-01-11",
      createdAtDate: new Date("2024-01-11T09:00:00Z"),
    });

    const filters: OrderFilters = {
      ...baseFilters,
      status: "delivered",
      clientId: "client-allowed",
      motoboyId: "motoboy-allowed",
      date: "2024-01-10",
    };

    const result = filterOrders([delivered, pending], filters);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("order-3");
  });

  it("matches text search across client, motoboy and neighborhoods", () => {
    const centro = createNormalizedOrder({
      id: "order-5",
      clientName: "Padaria Central",
      coletaBairro: "Centro",
      entregaBairro: "Zona Sul",
      motoboyName: "Carlos",
    });
    const jardins = createNormalizedOrder({
      id: "order-6",
      clientName: "Restaurante Jardins",
      coletaBairro: "Jardim Paulista",
      entregaBairro: "Moema",
      motoboyName: "Joana",
    });

    const filters: OrderFilters = {
      ...baseFilters,
      search: "zona",
    };

    const result = filterOrders([centro, jardins], filters);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("order-5");
  });
});
