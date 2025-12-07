import type { Order } from "@shared/schema";

export interface MotoboyReport {
  stats: {
    totalEntregas: number;
    ganhosSemanais: number;
    ganhosMensais: number;
  };
  breakdown: {
    byPayment: {
      Dinheiro: number;
      Cartão: number;
      Pix: number;
    };
  };
  orders: Array<{
    id: string;
    status: string;
    repasseMotoboy: number;
    createdAt: string;
    fotoComprovante?: string;
  }>;
}

export interface DashboardContentProps {
  availableOrders: Order[];
  myOrders: Order[];
  deliveredToday: Order[];
  totalEarnings: number;
  motoboyReport?: MotoboyReport;
  token: string | null;
  onAccept: (orderId: string) => void;
  onDeliver: (data: { orderId: string; proofUrl?: string }) => void;
  isAccepting: boolean;
  isDelivering: boolean;
}

export interface DeliveriesSectionProps {
  orders: Order[];
  onAccept: (orderId: string) => void;
  isAccepting: boolean;
}

export interface MyDeliveriesProps {
  orders: Order[];
  token: string | null;
  onDeliver: (data: { orderId: string; proofUrl?: string }) => void;
  isDelivering: boolean;
}

export interface HistoryProps {
  deliveredOrders: Order[];
}

export interface LiveDocsProps {
  deliveredOrders: Order[];
}
