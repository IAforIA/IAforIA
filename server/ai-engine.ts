import type { Motoboy, MotoboyLocation, Order } from "@shared/schema";
import { assignBestMotoboy } from "./ai-engine/assignment.js";
import { calculateDynamicTax } from "./ai-engine/pricing.js";
import { generateAutoResponse } from "./ai-engine/auto-response.js";
import { shouldAutoAccept } from "./ai-engine/auto-accept.js";
import { analyzeOrderPriority } from "./ai-engine/priority.js";
import { generateInsights } from "./ai-engine/insights.js";
import { optimizeRoutes } from "./ai-engine/optimize-routes.js";
import { generateChatResponse } from "./ai-engine/chat-response.js";
import { calculateDistance, parseDecimal } from "./ai-engine/helpers.js";

export class AIEngine {
  static assignBestMotoboy(order: Order, availableMotoboys: Motoboy[], currentLocations: Map<string, MotoboyLocation>) {
    return assignBestMotoboy(order, availableMotoboys, currentLocations);
  }

  static calculateDynamicTax(distance: number, baseTime: Date) {
    return calculateDynamicTax(distance, baseTime);
  }

  static generateAutoResponse(message: string, userRole: string) {
    return generateAutoResponse(message, userRole);
  }

  static shouldAutoAccept(order: Order, motoboy: Motoboy) {
    return shouldAutoAccept(order, motoboy);
  }

  static analyzeOrderPriority(order: Order) {
    return analyzeOrderPriority(order);
  }

  static generateInsights(orders: Order[], motoboys: Motoboy[]) {
    return generateInsights(orders, motoboys);
  }

  static optimizeRoutes(orders: Order[], motoboy: Motoboy) {
    return optimizeRoutes(orders, motoboy);
  }

  static generateChatResponse(message: string, category: string, userId: string) {
    return generateChatResponse(message, category, userId);
  }
}

export {
  assignBestMotoboy,
  calculateDynamicTax,
  generateAutoResponse,
  shouldAutoAccept,
  analyzeOrderPriority,
  generateInsights,
  optimizeRoutes,
  generateChatResponse,
  parseDecimal,
  calculateDistance,
};
