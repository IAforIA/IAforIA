/** Pagination helper */
import type { PaginatedResult } from './types.ts';

export function paginate<T>(data: T[], page: number, limit: number): PaginatedResult<T> {
  const total = data.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedData = data.slice(start, end);

  return {
    data: paginatedData,
    page,
    limit,
    total,
    totalPages,
  };
}
