import type { Order } from "@shared/schema";
import { hasUrgencyFlag, parseDecimal } from "./helpers.js";

export function analyzeOrderPriority(order: Order): number {
  let priority = 50;

  const valor = parseDecimal(order.valor) ?? 0;
  if (valor > 100) priority += 20;
  else if (valor > 50) priority += 10;

  const taxa = parseDecimal(order.taxaMotoboy) ?? 0;
  if (taxa > 15) priority += 30;
  else if (taxa > 10) priority += 15;

  if (hasUrgencyFlag(order)) priority += 25;

  return Math.min(priority, 100);
}
