/** Reports aggregator – modularized */
export type { ReportFilters, OrderFinancial, UserRole, PaginatedResult } from './reports/types.ts';
export { parseFilters } from './reports/filters.ts';
export { paginate } from './reports/pagination.ts';
export { mapOrderFinancial } from './reports/financial-mapper.ts';
export { filterByRoleOnResponse } from './reports/role-guard.ts';
export { getCompanyReport } from './reports/company-report.ts';
export { getClientReport } from './reports/client-report.ts';
export { getMotoboyReport } from './reports/motoboy-report.ts';
export { getOrdersReport } from './reports/orders-report.ts';

