import type { Motoboy, Order } from "@shared/schema";
import { parseDecimal } from "./helpers.js";

export function generateInsights(orders: Order[], motoboys: Motoboy[]) {
  const deliveredOrders = orders.filter((o) => o.status === "delivered");
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (parseDecimal(o.valor) ?? 0), 0);

  const completedWithTime = deliveredOrders.filter((o) => o.acceptedAt && o.deliveredAt);
  const avgDeliveryTime = completedWithTime.length > 0
    ? completedWithTime.reduce((sum, o) => {
        const accepted = new Date(o.acceptedAt!).getTime();
        const delivered = new Date(o.deliveredAt!).getTime();
        return sum + (delivered - accepted);
      }, 0) / completedWithTime.length / 60000
    : 0;

  const acceptedOrders = orders.filter((o) => o.status !== "pending");
  const acceptanceRate = orders.length > 0 ? (acceptedOrders.length / orders.length) * 100 : 0;

  const motoboyStats = new Map<string, number>();
  deliveredOrders.forEach((o) => {
    if (o.motoboyId) {
      motoboyStats.set(o.motoboyId, (motoboyStats.get(o.motoboyId) || 0) + 1);
    }
  });

  let topMotoboy: string | null = null;
  let maxDeliveries = 0;
  motoboyStats.forEach((count, id) => {
    if (count > maxDeliveries) {
      maxDeliveries = count;
      topMotoboy = id;
    }
  });

  const recommendations: string[] = [];
  if (acceptanceRate < 70) {
    recommendations.push("Taxa de aceitação baixa. Considere aumentar as taxas dos motoboys.");
  }

  if (avgDeliveryTime > 60) {
    recommendations.push("Tempo médio de entrega alto. Revise rotas e disponibilidade de motoboys.");
  }

  const onlineMotoboys = motoboys.filter((m) => m.online).length;
  if (onlineMotoboys < 3) {
    recommendations.push("Poucos motoboys online. Considere recrutar mais ou oferecer incentivos.");
  }

  if (totalRevenue > 0) {
    const avgOrderValue = totalRevenue / deliveredOrders.length;
    if (avgOrderValue < 30) {
      recommendations.push("Valor médio dos pedidos baixo. Considere estratégias de upsell.");
    }
  }

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgDeliveryTime: Math.round(avgDeliveryTime),
    acceptanceRate: Math.round(acceptanceRate * 10) / 10,
    topMotoboy,
    recommendations,
  };
}
