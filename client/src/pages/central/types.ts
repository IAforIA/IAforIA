import type { Order } from "@shared/schema";

export type NormalizedOrder = Order & {
  clientName: string;
  motoboyName?: string | null;
  motoboyId?: string | null;
  coletaBairro?: string | null;
  entregaBairro?: string | null;
  entregaRua?: string | null;
  totalValue: number;
  freteValue: number;
  produtoValue: number;
  motoboyValue: number;
  createdAtDate: Date;
  deliveredAtDate?: Date | null;
  proofUrl?: string | null;
};

export type CompanyReport = {
  kpis: {
    totalOrders: number;
    totalRevenue: number;
    totalComissoes: number;
    totalRepasses: number;
  };
  breakdown: {
    byPayment: {
      Dinheiro: { orders: number; revenue: number };
      Cartão: { orders: number; revenue: number };
      Pix: { orders: number; revenue: number };
    };
  };
  topClients: Array<{
    clientId: string;
    clientName: string;
    totalOrders: number;
    totalRevenue: number;
  }>;
  topMotoboys: Array<{
    motoboyId: string;
    motoboyName: string;
    totalOrders: number;
    totalRepasse: number;
  }>;
};
