/** Order-level role filtering */
import type { OrderFinancial, UserRole } from '../types.ts';

export function filterOrderByRole(order: OrderFinancial, role: UserRole, userId: string): OrderFinancial | null {
  if (role === 'client') {
    if (order.clientId !== userId) return null;
    const filtered = { ...order } as any;
    delete filtered.repasseMotoboy;
    delete filtered.comissaoGuriri;
    delete filtered.taxaMotoboy;
    delete filtered.guririRecebe;
    delete filtered.motoboyRecebe;
    delete filtered.comissaoEmpresa;
    delete filtered.lucroEmpresa;
    delete filtered.motoboyId;
    delete filtered.motoboyName;
    delete filtered.hasMensalidade;
    return filtered;
  }

  if (role === 'motoboy') {
    if (order.motoboyId !== userId) return null;
    const filtered = { ...order } as any;
    delete filtered.valorProduto;
    delete filtered.valorEntrega;
    delete filtered.totalCliente;
    delete filtered.totalEstabelecimento;
    delete filtered.produtoPrecoUnitario;
    delete filtered.produtoValorTotal;
    delete filtered.valor;
    delete filtered.comissaoGuriri;
    delete filtered.guririRecebe;
    delete filtered.comissaoEmpresa;
    delete filtered.lucroEmpresa;
    delete filtered.clientName;
    delete filtered.clientPhone;
    delete filtered.clientId;
    delete filtered.hasMensalidade;
    delete filtered.clienteRefId;
    return filtered;
  }

  return order;
}
