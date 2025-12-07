import type { Motoboy, Order } from "@shared/schema";
import { analyzeOrderPriority } from "./priority.js";

export function optimizeRoutes(orders: Order[], motoboy: Motoboy): Order[] {
  const pendingOrders = orders.filter(
    (order) => order.motoboyId === motoboy.id && order.status === "in_progress"
  );

  return pendingOrders.sort((a, b) => analyzeOrderPriority(b) - analyzeOrderPriority(a));
}
