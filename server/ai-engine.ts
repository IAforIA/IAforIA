/**
 * ARQUIVO: server/ai-engine.ts
 * PROPÓSITO: Motor de inteligência artificial para atribuição e otimização de entregas
 * 
 * ALGORITMOS PRINCIPAIS:
 * - assignBestMotoboy: Calcula distância (Haversine) e pontua motoboys
 * - calculateDynamicTax: Taxa dinâmica baseada em distância, horário e dia
 * - generateAutoResponse: Respostas automáticas para chat
 * - generateChatResponse: Respostas AI via OpenAI (com controle de custo)
 * - generateInsights: Analytics e recomendações para a central
 * - optimizeRoutes: Ordena pedidos por prioridade
 */

// Importa tipos das tabelas do schema compartilhado
import type { Order, Motoboy, MotoboyLocation } from "@shared/schema";
import OpenAI from "openai";
import { costTracker } from "./middleware/cost-tracker";
import { responseCache } from "./middleware/response-cache";
import { storage } from "./storage";

// ========================================
// TIPOS AUXILIARES
// ========================================

/**
 * TIPO: OrderWithLatLng
 * PROPÓSITO: Extende Order com campos opcionais de coordenadas GPS
 * NOTA: Schema atual não tem lat/lng - este tipo permite adicionar no futuro
 * USO: Geocodificação de endereços ou coordenadas manuais
 */
type OrderWithLatLng = Order & {
  coletaLat?: string | null;  // Latitude do endereço de coleta (Decimal como string)
  coletaLng?: string | null;  // Longitude do endereço de coleta
};

/**
 * INTERFACE: DistanceResult
 * PROPÓSITO: Resultado do cálculo de distância e score de um motoboy
 * USADO EM: assignBestMotoboy para ordenar motoboys por pontuacao
 */
interface DistanceResult {
  motoboyId: string;  // UUID do motoboy
  distance: number;   // Distância em km
  score: number;      // Pontuação (maior = melhor)
}

// ========================================
// CLASSE PRINCIPAL: AIEngine
// ========================================
/**
 * CLASSE EXPORTADA: AIEngine
 * PROPÓSITO: Centraliza toda lógica de IA e otimização do sistema
 * PADRÃO: Classe estática (todos os métodos são static)
 * USADO EM: routes.ts (/api/insights), storage.ts (atribuição automática)
 */
export class AIEngine {
  
  // ========================================
  // MÉTODO PRIVADO: CONVERSÃO DECIMAL
  // ========================================
  
  /**
   * MÉTODO PRIVADO: parseDecimal(value)
   * PROPÓSITO: Converte strings Decimal do Drizzle para number com segurança
   * MOTIVO: Drizzle retorna Decimal como string, mas cálculos precisam de number
   * RETORNA: number se válido, null se inválido/ausente
   * NOTA: Usado em todos os cálculos matemáticos (distância, taxa, etc)
   */
  private static parseDecimal(value: string | null | undefined): number | null {
    // VALIDAÇÃO: Se valor ausente, retorna null
    if (value === null || value === undefined) return null;
    
    // CONSTANTE: Conversão para número
    const num = parseFloat(value);
    
    // VALIDAÇÃO: Retorna null se conversão falhou (NaN)
    return isNaN(num) ? null : num; 
  }

  // ========================================
  // MÉTODO PRIVADO: CÁLCULO DE DISTÂNCIA
  // ========================================
  
  /**
   * MÉTODO PRIVADO: calculateDistance(lat1, lon1, lat2, lon2)
   * PROPÓSITO: Calcula distância entre dois pontos GPS usando fórmula de Haversine
   * ALGORITMO: Haversine - preciso para distâncias curtas (<1000km)
   * PARÂMETROS: Coordenadas em graus decimais (number)
   * RETORNA: Distância em quilômetros (km)
   * NOTA: Considera curvatura da Terra (não é linha reta)
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // CONSTANTE: Raio médio da Terra em quilômetros
    const R = 6371;
    
    // CONSTANTE: Diferença de latitude convertida para radianos
    const dLat = (lat2 - lat1) * Math.PI / 180;
    // CONSTANTE: Diferença de longitude convertida para radianos
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    // FÓRMULA HAVERSINE: Parte A
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    // FÓRMULA HAVERSINE: Parte C (arco)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    // RETORNA: Distância em km (raio * arco)
    return R * c;
  }

  // ========================================
  // MÉTODO ESTÁTICO: ATRIBUIÇÃO INTELIGENTE
  // ========================================
  
  /**
   * MÉTODO EXPORTADO: assignBestMotoboy(order, availableMotoboys, currentLocations)
   * PROPÓSITO: Atribui o melhor motoboy baseado em distância, status online e pontuação
   * ALGORITMO:
   *   0. Filtra motoboys que estão disponíveis no horário atual (schedules)
   *   1. Calcula distância de cada motoboy até o pedido (Haversine)
   *   2. Pontua: score = 100 - (distância * 10) + (online ? 20 : 0)
   *   3. Ordena por score (maior = melhor)
   *   4. Retorna ID do motoboy com maior pontuação
   * 
   * PARÂMETROS:
   *   - order: Pedido a ser atribuído
   *   - availableMotoboys: Lista de motoboys disponíveis
   *   - currentLocations: Map<motoboyId, localização GPS mais recente>
   * 
   * RETORNA: UUID do melhor motoboy ou null se nenhum disponível
   * 
   * LIMITAÇÃO ATUAL: Order não tem lat/lng, usa valores mockados
   * TODO: Integrar serviço de geocodificação (Google Maps, OpenStreetMap)
   */
  static async assignBestMotoboy(
    order: Order, 
    availableMotoboys: Motoboy[],
    currentLocations: Map<string, MotoboyLocation> // Map obtido de storage.getLatestMotoboyLocations()
  ): Promise<string | null> {
    // VALIDAÇÃO: Se não há motoboys disponíveis, retorna null
    if (availableMotoboys.length === 0) return null;

    // FILTRO DE DISPONIBILIDADE POR HORÁRIO
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Domingo, 6 = Sábado
    const currentHour = now.getHours();
    const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    
    // Determina o turno atual baseado na hora
    const currentShift = currentHour >= 6 && currentHour < 12 ? 'turnoManha' :
                         currentHour >= 12 && currentHour < 18 ? 'turnoTarde' : 'turnoNoite';
    
    // Busca schedules de todos os motoboys em paralelo
    const schedulesPromises = availableMotoboys.map(m => 
      storage.getMotoboySchedules(m.id)
    );
    const schedulesResults = await Promise.all(schedulesPromises);
    
    // Filtra apenas motoboys que trabalham hoje no turno atual
    const availableNow = availableMotoboys.filter((motoboy, index) => {
      const schedules = schedulesResults[index];
      const todaySchedule = schedules.find(s => s.diaSemana === currentDay);
      
      // Se não tem schedule para hoje, não está disponível
      if (!todaySchedule) return false;
      
      // Verifica se o turno atual está ativo
      return todaySchedule[currentShift as keyof typeof todaySchedule] === true;
    });

    // Se nenhum motoboy disponível no horário, retorna null
    if (availableNow.length === 0) {
      console.log(`[AI-Engine] Nenhum motoboy disponível para ${DAYS[currentDay]} ${currentShift}`);
      return null;
    }

    console.log(`[AI-Engine] ${availableNow.length}/${availableMotoboys.length} motoboys disponíveis agora`);

    // CRÍTICO: Coordenadas do pedido - MOCKADAS para demonstração
    // TODO: Implementar geocodificação de endereços (coletaRua + coletaCep -> lat/lng)
    const orderWithGeo = order as OrderWithLatLng;
    const orderLat = this.parseDecimal(orderWithGeo.coletaLat) || -19.0; // São Paulo mock
    const orderLng = this.parseDecimal(orderWithGeo.coletaLng) || -40.0;

    // CONSTANTE: Array de resultados com distância e score de cada motoboy DISPONÍVEL AGORA
    const scores: DistanceResult[] = availableNow.map(motoboy => {
      // CONSTANTE: Localização GPS mais recente do motoboy
      const location = currentLocations.get(motoboy.id);

      // VALIDAÇÃO: Se motoboy não tem localização, não pode ser atribuído
      if (!location) {
        return { motoboyId: motoboy.id, distance: Infinity, score: -Infinity };
      }

      // CONSTANTE: Coordenadas do motoboy convertidas para number
      const motoboyLat = this.parseDecimal(location.latitude)!;
      const motoboyLng = this.parseDecimal(location.longitude)!;

      // CONSTANTE: Distância em km entre motoboy e pedido
      const distance = this.calculateDistance(orderLat, orderLng, motoboyLat, motoboyLng);

      // VARIÁVEL: Pontuação inicial
      let score = 100;
      
      // LÓGICA: Penaliza distância (cada km reduz 10 pontos)
      score -= distance * 10;

      // LÓGICA: Bonifica motoboys online (+20 pontos)
      if (motoboy.online) score += 20;

      return { motoboyId: motoboy.id, distance, score };
    });

    // CONSTANTE: Filtra apenas motoboys válidos (com localização)
    const validScores = scores.filter(s => s.score > -Infinity);

    // VALIDAÇÃO: Se nenhum motoboy válido, retorna null
    if (validScores.length === 0) return null;

    // OPERAÇÃO: Ordena por score (maior primeiro)
    validScores.sort((a, b) => b.score - a.score);

    // RETORNA: ID do motoboy com maior pontuação
    return validScores[0]?.motoboyId || null;
  }

  // ========================================
  // MÉTODO ESTÁTICO: TAXA DINÂMICA
  // ========================================
  
  /**
   * MÉTODO EXPORTADO: calculateDynamicTax(distance, baseTime)
   * PROPÓSITO: Calcula taxa dinâmica baseada em distância, horário e dia da semana
   * ALGORITMO:
   *   1. Base: R$ 7,00
   *   2. Distância > 5km: + R$ 1,50 por km adicional
   *   3. Horário de pico almoço (11h-14h): +20%
   *   4. Horário de pico jantar (18h-20h): +30%
   *   5. Final de semana (sábado/domingo): +15%
   * 
   * PARÂMETROS:
   *   - distance: Distância em km
   *   - baseTime: Data/hora do pedido
   * 
   * RETORNA: Taxa calculada (arredondada para 2 casas decimais)
   * USADO EM: Criação de pedidos, sugestões de preço
   */
  static calculateDynamicTax(distance: number, baseTime: Date): number {
    // VARIÁVEL: Taxa base (R$ 7,00)
    let baseTax = 7.0;

    // LÓGICA: Adiciona R$ 1,50 por km acima de 5km
    if (distance > 5) baseTax += (distance - 5) * 1.5;

    // CONSTANTE: Hora do dia (0-23)
    const hour = baseTime.getHours();
    
    // LÓGICA: Horário de pico almoço (11h-14h) = +20%
    if (hour >= 11 && hour <= 14) baseTax *= 1.2;
    
    // LÓGICA: Horário de pico jantar (18h-20h) = +30%
    if (hour >= 18 && hour <= 20) baseTax *= 1.3;

    // CONSTANTE: Dia da semana (0=Domingo, 6=Sábado)
    const day = baseTime.getDay();
    
    // LÓGICA: Final de semana = +15%
    if (day === 0 || day === 6) baseTax *= 1.15;

    // RETORNA: Taxa arredondada para 2 casas decimais
    return Math.round(baseTax * 100) / 100;
  }

  // ========================================
  // MÉTODO ESTÁTICO: RESPOSTAS AUTOMÁTICAS
  // ========================================
  
  /**
   * MÉTODO EXPORTADO: generateAutoResponse(message, userRole)
   * PROPÓSITO: Gera respostas automáticas para mensagens de chat comuns
   * ALGORITMO: Pattern matching simples (palavras-chave)
   * 
   * PARÂMETROS:
   *   - message: Texto da mensagem do usuário
   *   - userRole: Papel do usuário ('client', 'motoboy', 'central')
   * 
   * RETORNA: Resposta automática ou null se não houver resposta
   * USADO EM: POST /api/chat para fornecer respostas instantâneas
   * TODO: Evoluir para NLP/ML (OpenAI, Dialogflow)
   */
  static generateAutoResponse(message: string, userRole: string): string | null {
    // CONSTANTE: Mensagem em minúsculas para busca case-insensitive
    const lowerMsg = message.toLowerCase();

    // PATTERN: Pergunta sobre status do pedido
    if (lowerMsg.includes('status') || lowerMsg.includes('onde está')) {
      return 'Seu pedido está em andamento. Acompanhe em tempo real pelo painel.';
    }

    // PATTERN: Solicitação de cancelamento
    if (lowerMsg.includes('cancelar')) {
      return 'Para cancelar, entre em contato com a central. Pedidos já aceitos podem ter taxa de cancelamento.';
    }

    // PATTERN: Pergunta sobre preço/valor
    if (lowerMsg.includes('preço') || lowerMsg.includes('valor')) {
      return 'O valor é calculado automaticamente baseado na distância e horário. Consulte a taxa no pedido.';
    }

    // PATTERN: Pedido urgente
    if (lowerMsg.includes('urgente')) {
      return 'Pedidos urgentes têm prioridade. A taxa pode ser ajustada conforme disponibilidade.';
    }

    // RETORNA: null se nenhum pattern corresponder (humano deve responder)
    return null;
  }

  // ========================================
  // MÉTODO ESTÁTICO: ACEITAÇÃO AUTOMÁTICA
  // ========================================
  
  /**
   * MÉTODO EXPORTADO: shouldAutoAccept(order, motoboy)
   * PROPÓSITO: Determina se motoboy deve aceitar pedido automaticamente
   * CRITÉRIOS:
   *   1. Taxa ≥ 1.5x taxa padrão do motoboy (aceita sempre)
   *   2. Motoboy online E taxa ≥ taxa padrão (aceita)
   * 
   * PARÂMETROS:
   *   - order: Pedido a avaliar
   *   - motoboy: Motoboy candidato
   * 
   * RETORNA: true se deve aceitar automaticamente, false caso contrário
   * USADO EM: Sistema de aceitação automática (futuro)
   */
  static shouldAutoAccept(order: Order, motoboy: Motoboy): boolean {
    // CONSTANTE: Taxa do pedido convertida para number
    const taxaValue = this.parseDecimal(order.taxaMotoboy) || 0;
    // CONSTANTE: Taxa padrão do motoboy
    const taxaPadrao = this.parseDecimal(motoboy.taxaPadrao) || 0;

    // LÓGICA: Taxa muito boa (1.5x padrão) = aceita sempre
    if (taxaValue >= taxaPadrao * 1.5) return true;

    // LÓGICA: Motoboy online E taxa razoável = aceita
    if (motoboy.online && taxaValue >= taxaPadrao) return true;

    // RETORNA: false (requer confirmação manual)
    return false;
  }

  // ========================================
  // MÉTODO ESTÁTICO: ANÁLISE DE PRIORIDADE
  // ========================================
  
  /**
   * MÉTODO EXPORTADO: analyzeOrderPriority(order)
   * PROPÓSITO: Calcula prioridade do pedido (0-100, maior = mais prioritário)
   * CRITÉRIOS:
   *   - Base: 50 pontos
   *   - Valor > R$100: +20 pontos | Valor > R$50: +10 pontos
   *   - Taxa > R$15: +30 pontos | Taxa > R$10: +15 pontos
   *   - Palavra "urgente" nas observações: +25 pontos
   * 
   * PARÂMETROS:
   *   - order: Pedido a analisar
   * 
   * RETORNA: Prioridade (0-100)
   * USADO EM: optimizeRoutes para ordenar pedidos
   */
  static analyzeOrderPriority(order: Order): number {
    // VARIÁVEL: Prioridade base
    let priority = 50;

    // CONSTANTE: Valor total do pedido
    const valor = this.parseDecimal(order.valor) || 0;
    
    // LÓGICA: Bonifica pedidos de alto valor
    if (valor > 100) priority += 20;
    else if (valor > 50) priority += 10;

    // CONSTANTE: Taxa do motoboy
    const taxa = this.parseDecimal(order.taxaMotoboy) || 0;
    
    // LÓGICA: Bonifica taxas altas (mais lucrativo)
    if (taxa > 15) priority += 30;
    else if (taxa > 10) priority += 15;

    // LÓGICA: Palavra-chave "urgente" aumenta prioridade
    if (order.observacoes?.toLowerCase().includes('urgente')) priority += 25;

    // RETORNA: Prioridade limitada a 100
    return Math.min(priority, 100);
  }

  // ========================================
  // MÉTODO ESTÁTICO: GERAR INSIGHTS E ANALYTICS
  // ========================================
  
  /**
   * MÉTODO EXPORTADO: generateInsights(orders, motoboys)
   * PROPÓSITO: Gera estatísticas e recomendações para o dashboard da central
   * MÉTRICAS CALCULADAS:
   *   - totalRevenue: Receita total de pedidos entregues
   *   - avgDeliveryTime: Tempo médio de entrega (em minutos)
   *   - acceptanceRate: Taxa de aceitação de pedidos (%)
   *   - topMotoboy: ID do motoboy com mais entregas
   *   - recommendations: Sugestões baseadas em dados
   * 
   * PARÂMETROS:
   *   - orders: Array de todos os pedidos
   *   - motoboys: Array de todos os motoboys
   * 
   * RETORNA: Objeto com métricas e recomendações
   * USADO EM: GET /api/insights (apenas central)
   */
  static generateInsights(orders: Order[], motoboys: Motoboy[]): {
    totalRevenue: number;
    avgDeliveryTime: number;
    acceptanceRate: number;
    topMotoboy: string | null;
    recommendations: string[];
  } {
    // CONSTANTE: Apenas pedidos entregues (status = 'delivered')
    const deliveredOrders = orders.filter(o => o.status === 'delivered');

    // MÉTRICA 1: Receita total (soma dos valores)
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (this.parseDecimal(o.valor) || 0), 0);

    // MÉTRICA 2: Tempo médio de entrega (acceptedAt -> deliveredAt)
    const completedWithTime = deliveredOrders.filter(o => o.acceptedAt && o.deliveredAt);
    const avgDeliveryTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, o) => {
          // CONSTANTE: Timestamp de aceitação
          const accepted = new Date(o.acceptedAt!).getTime();
          // CONSTANTE: Timestamp de entrega
          const delivered = new Date(o.deliveredAt!).getTime();
          // RETORNA: Diferença em milissegundos
          return sum + (delivered - accepted);
        }, 0) / completedWithTime.length / 60000  // Converte ms para minutos
      : 0;

    // MÉTRICA 3: Taxa de aceitação (pedidos não-pending / total)
    const acceptedOrders = orders.filter(o => o.status !== 'pending');
    const acceptanceRate = orders.length > 0 ? (acceptedOrders.length / orders.length) * 100 : 0;

    // MÉTRICA 4: Top motoboy (mais entregas)
    const motoboyStats = new Map<string, number>();
    deliveredOrders.forEach(o => {
      if (o.motoboyId) {
        motoboyStats.set(o.motoboyId, (motoboyStats.get(o.motoboyId) || 0) + 1);
      }
    });

    // VARIÁVEIS: Rastreamento do motoboy com mais entregas
    let topMotoboy: string | null = null;
    let maxDeliveries = 0;
    motoboyStats.forEach((count, id) => {
      if (count > maxDeliveries) {
        maxDeliveries = count;
        topMotoboy = id;
      }
    });

    // MÉTRICA 5: Recomendações baseadas em dados
    const recommendations: string[] = [];

    // RECOMENDAÇÃO 1: Taxa de aceitação baixa
    if (acceptanceRate < 70) {
      recommendations.push('Taxa de aceitação baixa. Considere aumentar as taxas dos motoboys.');
    }

    // RECOMENDAÇÃO 2: Tempo de entrega alto
    if (avgDeliveryTime > 60) {
      recommendations.push('Tempo médio de entrega alto. Revise rotas e disponibilidade de motoboys.');
    }

    // RECOMENDAÇÃO 3: Poucos motoboys online
    const onlineMotoboys = motoboys.filter(m => m.online).length;
    if (onlineMotoboys < 3) {
      recommendations.push('Poucos motoboys online. Considere recrutar mais ou oferecer incentivos.');
    }

    // RECOMENDAÇÃO 4: Valor médio baixo
    if (totalRevenue > 0) {
      const avgOrderValue = totalRevenue / deliveredOrders.length;
      if (avgOrderValue < 30) {
        recommendations.push('Valor médio dos pedidos baixo. Considere estratégias de upsell.');
      }
    }

    // RETORNA: Objeto com todas as métricas (arredondadas)
    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,     // 2 casas decimais
      avgDeliveryTime: Math.round(avgDeliveryTime),           // Inteiro (minutos)
      acceptanceRate: Math.round(acceptanceRate * 10) / 10,   // 1 casa decimal
      topMotoboy,
      recommendations
    };
  }

  // ========================================
  // MÉTODO ESTÁTICO: OTIMIZAÇÃO DE ROTAS
  // ========================================
  
  /**
   * MÉTODO EXPORTADO: optimizeRoutes(orders, motoboy)
   * PROPÓSITO: Ordena pedidos de um motoboy por prioridade (maior primeiro)
   * ALGORITMO: Usa analyzeOrderPriority() para pontuar cada pedido
   * 
   * PARÂMETROS:
   *   - orders: Array de todos os pedidos
   *   - motoboy: Motoboy para otimizar rotas
   * 
   * RETORNA: Array de pedidos ordenados por prioridade (decrescente)
   * USADO EM: Dashboard do motoboy para sugerir ordem de entregas
   * NOTA: Filtra apenas pedidos in_progress do motoboy especificado
   */
  static optimizeRoutes(orders: Order[], motoboy: Motoboy): Order[] {
    // CONSTANTE: Apenas pedidos em progresso deste motoboy
    const pendingOrders = orders.filter(o => 
      o.motoboyId === motoboy.id && o.status === 'in_progress'
    );

    // OPERAÇÃO: Ordena por prioridade (maior = mais prioritário)
    return pendingOrders.sort((a, b) => {
      const priorityA = this.analyzeOrderPriority(a);
      const priorityB = this.analyzeOrderPriority(b);
      return priorityB - priorityA; // Ordem decrescente
    });
  }

  // ========================================
  // MÉTODO ESTÁTICO: RESPOSTA OPENAI (COST-OPTIMIZED)
  // ========================================

  /**
   * MÉTODO EXPORTADO: generateChatResponse(message, category, userId)
   * PROPÓSITO: Gera resposta usando OpenAI API com controles de custo ESTRITOS
   * 
   * OTIMIZAÇÕES DE CUSTO:
   * - Modelo: gpt-4o-mini (mais barato)
   * - Prompts ultra-concisos (< 100 tokens)
   * - max_tokens: 150 (respostas curtas)
   * - temperature: 0.7 (balanceado)
   * - Tracking de tokens/custos em tempo real
   * 
   * PARÂMETROS:
   *   - message: Mensagem do usuário
   *   - category: Categoria do chat ('suporte', 'problema', 'status_entrega')
   *   - userId: ID do usuário (para tracking de custo)
   * 
   * RETORNA: Resposta da IA ou mensagem de erro
   */
  static async generateChatResponse(
    message: string,
    category: string,
    userId: string
  ): Promise<string> {
    try {
      // OTIMIZAÇÃO 1: Verifica cache primeiro (evita API call)
      const cachedResponse = responseCache.get(message, category);
      if (cachedResponse) {
        return cachedResponse;
      }

      // VALIDAÇÃO: Verifica se OpenAI está configurada
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      // CONSTANTE: Cliente OpenAI
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // OTIMIZAÇÃO: Prompts ultra-concisos por categoria (< 100 tokens cada)
      const systemPrompts: Record<string, string> = {
        suporte: 
          'Você é assistente de entregas. Seja breve e direto. Máx 2 frases.',
        problema:
          'Você resolve problemas de entrega. Responda de forma clara e concisa. Máx 2 frases.',
        status_entrega:
          'Você informa status de pedidos. Seja objetivo. Máx 2 frases.',
      };

      const systemPrompt = systemPrompts[category] || systemPrompts.suporte;

      // CHAMADA API: OpenAI com limites de custo
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Modelo mais barato
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 150, // Resposta curta = custo baixo
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      // TRACKING: Registra uso de tokens e custo
      const usage = completion.usage;
      if (usage) {
        costTracker.recordUsage(
          usage.prompt_tokens,
          usage.completion_tokens
        );

        console.log(`💰 AI Cost: ${usage.prompt_tokens} in + ${usage.completion_tokens} out = ~$${costTracker.calculateCost(usage.prompt_tokens, usage.completion_tokens).toFixed(6)}`);
      }

      // EXTRAI RESPOSTA
      const aiResponse = completion.choices[0]?.message?.content?.trim() || 
        'Desculpe, não consegui gerar uma resposta. Tente novamente.';

      // OTIMIZAÇÃO 2: Armazena no cache para reutilização
      responseCache.set(message, category, aiResponse);

      // RETORNA: Resposta da IA
      return aiResponse;

    } catch (error: any) {
      console.error('❌ OpenAI Error:', error.message);
      
      // FALLBACK: Retorna resposta genérica em caso de erro
      if (error.code === 'insufficient_quota') {
        return 'Sistema de IA temporariamente indisponível. Entre em contato com o suporte.';
      }
      
      return 'Desculpe, ocorreu um erro. Nossa equipe foi notificada.';
    }
  }

}
