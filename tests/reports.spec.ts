import { describe, it, expect } from 'vitest';
import { parseFilters } from '../server/reports/filters.ts';
import { paginate } from '../server/reports/pagination.ts';
import { filterByRoleOnResponse } from '../server/reports/role-guard.ts';

// Helper to build a minimal OrderFinancial-like object without pulling DB
const baseOrder = {
  id: 'order-1',
  clientId: 'client-1',
  motoboyId: 'motoboy-1',
  status: 'delivered',
  createdAt: new Date('2025-01-02'),
  valorProduto: 10,
  valorEntrega: 5,
  repasseMotoboy: 7,
  comissaoGuriri: 3,
  totalEstabelecimento: 15,
  totalCliente: 15,
  hasMensalidade: false,
  formaPagamento: 'Pix',
} as const;

describe('reports filters', () => {
  it('parses valid dates, numeric pagination, and whitelists known fields', () => {
    const filters = parseFilters({
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      status: 'delivered',
      paymentMethod: 'pix',
      clientId: 'client-1',
      motoboyId: 'moto-2',
      page: '2',
      limit: '100',
      ignored: 'x',
    });

    expect(filters.startDate?.toISOString()).toContain('2025-01-01');
    expect(filters.endDate?.toISOString()).toContain('2025-01-31');
    expect(filters.status).toBe('delivered');
    expect(filters.paymentMethod).toBe('pix');
    expect(filters.clientId).toBe('client-1');
    expect(filters.motoboyId).toBe('moto-2');
    expect(filters.page).toBe(2);
    expect(filters.limit).toBe(100);
    // Ensure unknown fields are dropped
    // @ts-expect-error - ignored should not exist
    expect(filters.ignored).toBeUndefined();
  });
});

describe('reports pagination', () => {
  it('returns slice with metadata', () => {
    const data = Array.from({ length: 5 }, (_, i) => i + 1);
    const result = paginate(data, 2, 2);
    expect(result.data).toEqual([3, 4]);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(2);
    expect(result.total).toBe(5);
    expect(result.totalPages).toBe(3);
  });
});

describe('role guard', () => {
  it('filters out non-owned orders for client and removes sensitive fields', () => {
    const otherClient = { ...baseOrder, clientId: 'other' };
    const owned = { ...baseOrder };
    const result = filterByRoleOnResponse([otherClient, owned], 'client', 'client-1') as any[];
    expect(result.length).toBe(1);
    expect(result[0].clientId).toBe('client-1');
    expect(result[0].repasseMotoboy).toBeUndefined();
    expect(result[0].comissaoGuriri).toBeUndefined();
    expect(result[0].motoboyId).toBeUndefined();
  });

  it('filters out non-owned orders for motoboy and hides client financials', () => {
    const otherMoto = { ...baseOrder, motoboyId: 'other' };
    const owned = { ...baseOrder };
    const result = filterByRoleOnResponse([otherMoto, owned], 'motoboy', 'motoboy-1') as any[];
    expect(result.length).toBe(1);
    expect(result[0].motoboyId).toBe('motoboy-1');
    expect(result[0].valorProduto).toBeUndefined();
    expect(result[0].totalCliente).toBeUndefined();
    expect(result[0].clientId).toBeUndefined();
  });

  it('central sees everything unchanged', () => {
    const result = filterByRoleOnResponse(baseOrder, 'central');
    expect(result).toEqual(baseOrder);
  });
});
