import type { Order } from "@shared/schema";

export interface ClientReport {
  stats: {
    totalOrders: number;
    totalFaturamento: number;
    totalRepasse: number;
  };
  breakdown: {
    byPayment: {
      Dinheiro: { orders: number; revenue: number };
      Cartão: { orders: number; revenue: number };
      Pix: { orders: number; revenue: number };
    };
  };
  orders: Array<{
    id: string;
    status: string;
    valorProduto: number;
    valorEntrega: number;
    totalCliente: number;
    createdAt: string;
  }>;
}

export interface ClientScheduleEntry {
  id: string;
  clientId: string;
  diaSemana: number;
  horaAbertura: string | null;
  horaFechamento: string | null;
  fechado: boolean;
}

export interface DashboardContentProps {
  clientOrders: Order[];
  totalOrders: number;
  pending: number;
  inProgress: number;
  delivered: number;
  cancelled: number;
  clientReport?: ClientReport;
}
