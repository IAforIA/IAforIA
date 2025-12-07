/** Shared report types */
import type { Order, Client, Motoboy } from '@shared/schema';

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  paymentMethod?: string;
  clientId?: string;
  motoboyId?: string;
  page?: number;
  limit?: number;
}

export interface OrderFinancial extends Order {
  valorProduto: number;
  valorEntrega: number;
  repasseMotoboy: number;
  comissaoGuriri: number;
  totalEstabelecimento: number;
  totalCliente: number;
  hasMensalidade: boolean;
}

export type UserRole = 'central' | 'client' | 'motoboy';

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type ClientEntity = Client;
export type MotoboyEntity = Motoboy;
