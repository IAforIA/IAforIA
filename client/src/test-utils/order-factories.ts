import type { Order } from "@shared/schema";
import type { NormalizedOrder } from "@/types/orders";

const defaultDate = new Date("2024-01-10T10:00:00Z");

export function createOrder(overrides: Partial<Order> = {}): Order {
  const order: Order = {
    id: "order-id",
    clientId: "client-id",
    clientName: "Cliente",
    clientPhone: "11999999999",
    clienteRefId: null,
    coletaRua: "Rua A",
    coletaNumero: "100",
    coletaComplemento: null,
    coletaBairro: "Centro",
    coletaCep: "01000-000",
    coletaOverride: false,
    entregaRua: "Rua B",
    entregaNumero: "200",
    entregaComplemento: null,
    entregaBairro: "Bairro B",
    entregaCep: "02000-000",
    referencia: null,
    observacoes: null,
    produtoNome: null,
    produtoQuantidade: null,
    produtoPrecoUnitario: null,
    produtoValorTotal: "0",
    valor: "10",
    taxaMotoboy: "5",
    formaPagamento: "Dinheiro",
    hasTroco: false,
    trocoValor: null,
    motoboyId: "motoboy-id",
    motoboyName: "Motoboy",
    status: "pending",
    proofUrl: null,
    createdAt: defaultDate,
    acceptedAt: null,
    deliveredAt: null,
    ...overrides,
  };

  return order;
}

export function createNormalizedOrder(overrides: Partial<NormalizedOrder> = {}): NormalizedOrder {
  const {
    freteValue,
    produtoValue,
    totalValue,
    motoboyValue,
    createdAtDate,
    createdDateString,
    deliveredAtDate,
    deliveredDateString,
    ...orderOverrides
  } = overrides;

  const baseOrder = createOrder(orderOverrides);
  const baseCreatedAtDate = createdAtDate ?? (baseOrder.createdAt as Date);
  const baseDeliveredAtDate =
    deliveredAtDate ?? ((baseOrder.deliveredAt as Date | null) ?? undefined);

  return {
    ...baseOrder,
    freteValue: freteValue ?? Number(baseOrder.valor),
    produtoValue: produtoValue ?? Number(baseOrder.produtoValorTotal ?? 0),
    totalValue:
      totalValue ?? Number(baseOrder.valor) + Number(baseOrder.produtoValorTotal ?? 0),
    motoboyValue: motoboyValue ?? Number(baseOrder.taxaMotoboy),
    createdAtDate: baseCreatedAtDate,
    createdDateString: createdDateString ?? baseCreatedAtDate.toISOString().split("T")[0],
    deliveredAtDate: baseDeliveredAtDate,
    deliveredDateString:
      deliveredDateString ?? baseDeliveredAtDate?.toISOString().split("T")[0],
  };
}
