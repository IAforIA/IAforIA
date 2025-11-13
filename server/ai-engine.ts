import type { Order, Motoboy } from "@shared/schema";

interface DistanceResult {
  motoboyId: string;
  distance: number;
  score: number;
}

export class AIEngine {
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static async assignBestMotoboy(order: Order, availableMotoboys: Motoboy[]): Promise<string | null> {
    if (availableMotoboys.length === 0) return null;

    const orderLat = -19.0;
    const orderLng = -40.0;

    const scores: DistanceResult[] = availableMotoboys.map(motoboy => {
      const motoboyLat = motoboy.currentLat ? parseFloat(motoboy.currentLat) : -19.0;
      const motoboyLng = motoboy.currentLng ? parseFloat(motoboy.currentLng) : -40.0;

      const distance = this.calculateDistance(orderLat, orderLng, motoboyLat, motoboyLng);
      
      let score = 100;
      score -= distance * 10;
      
      if (motoboy.online) score += 20;
      
      return {
        motoboyId: motoboy.id,
        distance,
        score
      };
    });

    scores.sort((a, b) => b.score - a.score);
    
    return scores[0]?.motoboyId || null;
  }

  static calculateDynamicTax(distance: number, baseTime: Date): number {
    let baseTax = 7.0;
    
    if (distance > 5) baseTax += (distance - 5) * 1.5;
    
    const hour = baseTime.getHours();
    if (hour >= 11 && hour <= 14) baseTax *= 1.2;
    if (hour >= 18 && hour <= 20) baseTax *= 1.3;
    
    const day = baseTime.getDay();
    if (day === 0 || day === 6) baseTax *= 1.15;
    
    return Math.round(baseTax * 100) / 100;
  }

  static generateAutoResponse(message: string, userRole: string): string | null {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('status') || lowerMsg.includes('onde está')) {
      return 'Seu pedido está em andamento. Acompanhe em tempo real pelo painel.';
    }
    
    if (lowerMsg.includes('cancelar')) {
      return 'Para cancelar, entre em contato com a central. Pedidos já aceitos podem ter taxa de cancelamento.';
    }
    
    if (lowerMsg.includes('preço') || lowerMsg.includes('valor')) {
      return 'O valor é calculado automaticamente baseado na distância e horário. Consulte a taxa no pedido.';
    }
    
    if (lowerMsg.includes('urgente')) {
      return 'Pedidos urgentes têm prioridade. A taxa pode ser ajustada conforme disponibilidade.';
    }
    
    return null;
  }

  static shouldAutoAccept(order: Order, motoboy: Motoboy): boolean {
    const taxaValue = parseFloat(order.taxaMotoboy);
    const taxaPadrao = parseFloat(motoboy.taxaPadrao);
    
    if (taxaValue >= taxaPadrao * 1.5) return true;
    
    if (motoboy.online && taxaValue >= taxaPadrao) return true;
    
    return false;
  }

  static analyzeOrderPriority(order: Order): number {
    let priority = 50;
    
    const valor = parseFloat(order.valor);
    if (valor > 100) priority += 20;
    else if (valor > 50) priority += 10;
    
    const taxa = parseFloat(order.taxaMotoboy);
    if (taxa > 15) priority += 30;
    else if (taxa > 10) priority += 15;
    
    if (order.observacoes?.toLowerCase().includes('urgente')) priority += 25;
    
    return Math.min(priority, 100);
  }

  static generateInsights(orders: Order[], motoboys: Motoboy[]): {
    totalRevenue: number;
    avgDeliveryTime: number;
    acceptanceRate: number;
    topMotoboy: string | null;
    recommendations: string[];
  } {
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.valor), 0);
    
    const completedWithTime = deliveredOrders.filter(o => o.acceptedAt && o.deliveredAt);
    const avgDeliveryTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, o) => {
          const accepted = new Date(o.acceptedAt!).getTime();
          const delivered = new Date(o.deliveredAt!).getTime();
          return sum + (delivered - accepted);
        }, 0) / completedWithTime.length / 60000
      : 0;
    
    const acceptedOrders = orders.filter(o => o.status !== 'pending');
    const acceptanceRate = orders.length > 0 ? (acceptedOrders.length / orders.length) * 100 : 0;
    
    const motoboyStats = new Map<string, number>();
    deliveredOrders.forEach(o => {
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
      recommendations.push('Taxa de aceitação baixa. Considere aumentar as taxas dos motoboys.');
    }
    
    if (avgDeliveryTime > 60) {
      recommendations.push('Tempo médio de entrega alto. Revise rotas e disponibilidade de motoboys.');
    }
    
    const onlineMotoboys = motoboys.filter(m => m.online).length;
    if (onlineMotoboys < 3) {
      recommendations.push('Poucos motoboys online. Considere recrutar mais ou oferecer incentivos.');
    }
    
    if (totalRevenue > 0) {
      const avgOrderValue = totalRevenue / deliveredOrders.length;
      if (avgOrderValue < 30) {
        recommendations.push('Valor médio dos pedidos baixo. Considere estratégias de upsell.');
      }
    }
    
    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgDeliveryTime: Math.round(avgDeliveryTime),
      acceptanceRate: Math.round(acceptanceRate * 10) / 10,
      topMotoboy,
      recommendations
    };
  }

  static optimizeRoutes(orders: Order[], motoboy: Motoboy): Order[] {
    const pendingOrders = orders.filter(o => 
      o.motoboyId === motoboy.id && o.status === 'in_progress'
    );
    
    return pendingOrders.sort((a, b) => {
      const priorityA = this.analyzeOrderPriority(a);
      const priorityB = this.analyzeOrderPriority(b);
      return priorityB - priorityA;
    });
  }
}
