/** Role-based response filtering */
import type { OrderFinancial, UserRole } from './types.ts';
import { filterOrderByRole } from './role-guard/order-filter.ts';

export function filterByRoleOnResponse<T>(data: T, role: UserRole, userId?: string): T {
  if (role === 'central') return data;
  if (!userId) throw new Error(`userId é obrigatório para role '${role}'`);

  if (Array.isArray(data)) {
    return data.map(item => filterByRoleOnResponse(item, role, userId)).filter(item => item !== null) as T;
  }

  if (data && typeof data === 'object') {
    const obj = data as any;
    if ('id' in obj && 'clientId' in obj && 'status' in obj) {
      return filterOrderByRole(obj as OrderFinancial, role, userId) as T;
    }
    const filtered: any = {};
    for (const key in obj) filtered[key] = filterByRoleOnResponse(obj[key], role, userId);
    return filtered as T;
  }

  return data;
}
