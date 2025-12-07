import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Router } from "wouter";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { filterOrders } from "@/services/orders";
import { normalizeOrders } from "@/adapters/order-adapter";
import type { Order } from "@shared/schema";

// Keep sidebar stable in tests (no mobile collapse logic)
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

// Control current path without relying on wouter memory router
let mockPath = "/";
vi.mock("wouter", async () => {
  const actual = await vi.importActual<any>("wouter");
  return {
    ...actual,
    useLocation: () => [mockPath, vi.fn()],
    Router: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Link: ({ href, children, ...props }: any) => (
      <a data-href={href} {...props}>
        {children}
      </a>
    ),
  };
});

const baseOrder = (override: Partial<Order>): Order => ({
  id: "order-1",
  clientId: "client-1",
  clientName: "Client One",
  clientPhone: "4899999999",
  clienteRefId: null,
  coletaRua: "Rua A",
  coletaNumero: "100",
  coletaComplemento: null,
  coletaBairro: "Centro",
  coletaCep: "00000-000",
  coletaOverride: false,
  entregaRua: "Rua B",
  entregaNumero: "200",
  entregaComplemento: null,
  entregaBairro: "Bairro B",
  entregaCep: "00000-000",
  referencia: null,
  observacoes: null,
  produtoNome: null,
  produtoQuantidade: null,
  produtoPrecoUnitario: null,
  produtoValorTotal: null,
  valor: "7.00",
  taxaMotoboy: "3.00",
  formaPagamento: "pix",
  hasTroco: false,
  trocoValor: null,
  motoboyId: "driver-1",
  motoboyName: "Driver One",
  status: "delivered",
  proofUrl: "/uploads/proof-1.jpg",
  createdAt: new Date("2024-01-02T10:00:00Z"),
  acceptedAt: null,
  deliveredAt: new Date("2024-01-02T11:00:00Z"),
  ...override,
});

const expectLiveDocs = (orders: Order[], expectedIds: string[]) => {
  const docs = orders.filter((o) => o.status === "delivered" && !!o.proofUrl);
  expect(docs.map((o) => o.id)).toEqual(expectedIds);
  docs.forEach((doc) => {
    expect(doc.proofUrl).toBeTruthy();
  });
};

describe("Live Docs visibility by role", () => {
  it("central sees all delivered orders with proof attached", () => {
    const orders: Order[] = [
      baseOrder({ id: "ord-1", proofUrl: "/uploads/doc-1.jpg" }),
      baseOrder({ id: "ord-2", status: "delivered", proofUrl: null }),
      baseOrder({ id: "ord-3", status: "pending", proofUrl: "/uploads/doc-3.jpg" }),
    ];

    expectLiveDocs(orders, ["ord-1"]);
  });

  it("client sees only their delivered orders with proof", () => {
    const clientId = "client-2";
    const orders: Order[] = [
      baseOrder({ id: "ord-1", clientId, proofUrl: "/uploads/doc-1.jpg" }),
      baseOrder({ id: "ord-2", clientId, status: "delivered", proofUrl: null }),
      baseOrder({ id: "ord-3", clientId: "other-client", proofUrl: "/uploads/doc-3.jpg" }),
    ];

    const deliveredForClient = orders.filter(
      (o) => o.clientId === clientId && o.status === "delivered" && !!o.proofUrl,
    );

    expect(deliveredForClient.map((o) => o.id)).toEqual(["ord-1"]);
    deliveredForClient.forEach((o) => expect(o.proofUrl).toBeTruthy());
  });

  it("driver sees only their delivered orders with proof", () => {
    const driverId = "driver-9";
    const orders: Order[] = [
      baseOrder({ id: "ord-1", motoboyId: driverId, proofUrl: "/uploads/doc-1.jpg" }),
      baseOrder({ id: "ord-2", motoboyId: driverId, proofUrl: null }),
      baseOrder({ id: "ord-3", motoboyId: "another-driver", proofUrl: "/uploads/doc-3.jpg" }),
    ];

    const myHistory = orders.filter((o) => o.motoboyId === driverId && o.status === "delivered");
    const docs = myHistory.filter((o) => !!o.proofUrl);

    expect(docs.map((o) => o.id)).toEqual(["ord-1"]);
    docs.forEach((o) => expect(o.proofUrl).toBeTruthy());
  });
});

describe("Order filters (sidebar-driven views)", () => {
  const orders = normalizeOrders([
    baseOrder({ id: "ord-a", clientId: "client-1", motoboyId: "driver-1", status: "delivered", createdAt: new Date("2024-02-01T12:00:00Z") }),
    baseOrder({ id: "ord-b", clientId: "client-2", motoboyId: "driver-2", status: "in_progress", createdAt: new Date("2024-02-02T12:00:00Z"), motoboyName: "Joao", clientName: "Maria", entregaBairro: "Praia" }),
    baseOrder({ id: "ord-c", clientId: "client-2", motoboyId: "driver-1", status: "pending", createdAt: new Date("2024-02-02T15:00:00Z"), coletaBairro: "Centro" }),
  ]);

  it("combines status, client, motoboy, date and search filters", () => {
    const filters = {
      status: "in_progress" as const,
      clientId: "client-2" as const,
      motoboyId: "driver-2" as const,
      date: orders[1].createdDateString,
      search: "praia",
    };

    const result = filterOrders(orders, filters);
    expect(result.map((o) => o.id)).toEqual(["ord-b"]);
  });

  it("search matches client or motoboy names and locations", () => {
    const filters = {
      status: "all" as const,
      clientId: "all" as const,
      motoboyId: "all" as const,
      date: "",
      search: "maria",
    };

    const result = filterOrders(orders, filters);
    expect(result.map((o) => o.id)).toEqual(["ord-b"]);
  });
});

describe("Sidebar navigation", () => {
  const renderSidebar = (role: "central" | "client" | "driver", location: string) => {
    mockPath = location;
    render(
      <Router>
        <SidebarProvider>
          <AppSidebar role={role} />
        </SidebarProvider>
      </Router>,
    );
  };

  it("highlights active link for central live docs and lists all entries", () => {
    renderSidebar("central", "/central/live-docs");
    const active = screen.getByTestId("link-live-docs");
    expect(active.getAttribute("data-active")).toBe("true");
    // 8 menu links + header home link
    expect(screen.getAllByTestId(/link-/i)).toHaveLength(9);
  });

  it("highlights active link for client live docs and lists all entries", () => {
    renderSidebar("client", "/client/live-docs");
    const active = screen.getByTestId("link-live-docs");
    expect(active.getAttribute("data-active")).toBe("true");
    // 6 menu links + header home link
    expect(screen.getAllByTestId(/link-/i)).toHaveLength(7);
  });

  it("highlights active link for driver live docs and lists all entries", () => {
    renderSidebar("driver", "/driver/live-docs");
    const active = screen.getByTestId("link-live-docs");
    expect(active.getAttribute("data-active")).toBe("true");
    // 7 menu links + header home link
    expect(screen.getAllByTestId(/link-/i)).toHaveLength(8);
  });
});
