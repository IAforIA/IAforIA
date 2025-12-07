/** Filters parsing utilities */
import type { ReportFilters } from './types.ts';

export function parseFilters(query: Record<string, any>): ReportFilters {
  const filters: ReportFilters = {};

  if (query.startDate) {
    const date = new Date(query.startDate as string);
    if (!isNaN(date.getTime())) filters.startDate = date;
  }

  if (query.endDate) {
    const date = new Date(query.endDate as string);
    if (!isNaN(date.getTime())) filters.endDate = date;
  }

  if (query.status && typeof query.status === 'string') filters.status = query.status;
  if (query.paymentMethod && typeof query.paymentMethod === 'string') filters.paymentMethod = query.paymentMethod;
  if (query.clientId && typeof query.clientId === 'string') filters.clientId = query.clientId;
  if (query.motoboyId && typeof query.motoboyId === 'string') filters.motoboyId = query.motoboyId;

  filters.page = parseInt(query.page as string) || 1;
  filters.limit = parseInt(query.limit as string) || 50;

  if (filters.page < 1) filters.page = 1;
  if (filters.limit < 1) filters.limit = 1;
  if (filters.limit > 1000) filters.limit = 1000;

  return filters;
}
