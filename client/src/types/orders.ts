import type { Order, OrderStatus } from "@shared/schema";

export type OrderStatusFilter = OrderStatus | "all";

export interface OrderFilters {
  status: OrderStatusFilter;
  clientId: string | "all";
  motoboyId: string | "all";
  paymentMethod: string | "all";
  date: string;
  startDate: string;
  endDate: string;
  search: string;
}

export interface NormalizedOrder extends Order {
  freteValue: number;
  produtoValue: number;
  totalValue: number;
  motoboyValue: number;
  createdAtDate: Date;
  createdDateString: string;
  deliveredAtDate?: Date;
  deliveredDateString?: string;
}
