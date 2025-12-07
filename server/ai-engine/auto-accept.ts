import type { Motoboy, Order } from "@shared/schema";
import { parseDecimal } from "./helpers.js";

export function shouldAutoAccept(order: Order, motoboy: Motoboy): boolean {
  const taxaValue = parseDecimal(order.taxaMotoboy) ?? 0;
  const taxaPadrao = parseDecimal(motoboy.taxaPadrao) ?? 0;

  if (taxaValue >= taxaPadrao * 1.5) return true;
  if (motoboy.online && taxaValue >= taxaPadrao) return true;
  return false;
}
