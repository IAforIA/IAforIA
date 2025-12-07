import type { NormalizedOrder } from "@/types/orders";

export interface FinanceFilters {
  dateStart: string;
  dateEnd: string;
  motoboyId: string | "all";
  clientId: string | "all";
}

export interface FinancialSummary {
  totalFrete: number;
  totalProduto: number;
  totalMotoboy: number;
  volumeTotal: number;
  lucroGuriri: number;
  totalOrders: number;
}

export interface ClientFinancialSnapshot {
  clientId: string;
  clientName: string;
  orders: NormalizedOrder[];
  totalFrete: number;
  totalProduto: number;
  totalMovimentado: number;
}

export interface MotoboyPayoutSnapshot {
  motoboyId: string;
  motoboyName: string;
  orders: NormalizedOrder[];
  totalRepasse: number;
}
