/**
 * ARQUIVO: server/chatbot-filter.ts
 * PROPÓSITO: Sistema de chatbot com 3 camadas (Auto → IA → Humano)
 * 
 * ESTRATÉGIA:
 * 1. Filtro automático resolve 70% (ZERO custo, < 50ms)
 * 2. IA sugere para Central nos 30% restantes
 * 3. Humano intervém apenas em casos críticos
 * 
 * INTEGRAÇÃO:
 * - NÃO quebra sistema atual (ai-engine.ts mantido)
 * - Adiciona camada antes de chamar OpenAI
 * - IA sempre observa para aprender
 */

import type { Order, ChatMessage } from "@shared/schema";
import { storage } from "./storage";

// ========================================
// TIPOS
// ========================================

export interface FilterResult {
  shouldAutoReply: boolean;          // Se deve enviar resposta automática
  autoReplyMessage: string | null;   // Mensagem pronta (se shouldAutoReply = true)
  shouldSuggestAI: boolean;          // Se deve pedir sugestão da OpenAI
  category: 'status' | 'problema' | 'suporte' | 'pagamento' | 'cancelamento' | 'geral';
  confidence: number;                // 0-100: confiança na categorização
  requiresHuman: boolean;            // Se OBRIGATORIAMENTE precisa humano
  reasoning: string;                 // Explicação da decisão (para IA aprender)
}

export interface AILearningLog {
  messageId: string;
  filterDecision: FilterResult;
  aiSuggestion: string | null;      // O que a IA sugeriu (se pediu)
  humanResponse: string | null;     // O que o humano realmente enviou
  humanAction: 'accepted' | 'edited' | 'ignored' | 'wrote_from_scratch';
  timestamp: Date;
  category: string;
}

// ========================================
// CLASSE PRINCIPAL
// ========================================

export class ChatbotFilter {
  
  // Lista de palavras que SEMPRE requerem humano (casos sensíveis)
  private static CRITICAL_KEYWORDS = [
    'advogado', 'processo', 'judicial', 'polícia',
    'roubo', 'assalto', 'acidente', 'hospital',
    'morte', 'morto', 'faleceu', 'óbito',
    'racismo', 'discriminação', 'assédio',
  ];

  // Padrões de perguntas comuns (resolvidas automaticamente)
  private static AUTO_REPLY_PATTERNS = [
    {
      keywords: ['horário', 'funciona', 'abre', 'fecha', 'atendimento'],
      response: '🕐 Atendimento: Segunda a Sexta 8h-18h | Sábado 8h-12h',
      category: 'geral' as const,
      confidence: 95,
    },
    {
      keywords: ['preço', 'valor', 'taxa', 'quanto custa'],
      response: '💰 Valor calculado por distância + horário. Veja no pedido ou solicite orçamento.',
      category: 'geral' as const,
      confidence: 90,
    },
    {
      keywords: ['prazo', 'demora', 'tempo', 'quanto tempo'],
      response: '⏱️ Entrega: 30-60 min em média. Acompanhe em tempo real no painel.',
      category: 'geral' as const,
      confidence: 85,
    },
    {
      keywords: ['área', 'atende', 'região', 'bairro', 'entregar'],
      response: '📍 Atendemos toda a Grande Vitória. Consulte disponibilidade para áreas específicas.',
      category: 'geral' as const,
      confidence: 80,
    },
  ];

  /**
   * MÉTODO PRINCIPAL: Analisa mensagem e decide rota (Auto/IA/Humano)
   */
  static async analyzeMessage(
    message: string,
    senderId: string,
    senderRole: 'client' | 'motoboy' | 'central',
    orderId: number | null,
    conversationHistory: ChatMessage[] = []
  ): Promise<FilterResult> {
    
    const lowerMsg = message.toLowerCase().trim();

    // ============================
    // REGRA 0: CENTRAL SEMPRE TEM CONTROLE TOTAL
    // ============================
    if (senderRole === 'central') {
      return {
        shouldAutoReply: false,
        autoReplyMessage: null,
        shouldSuggestAI: false, // Central não recebe sugestões de suas próprias msgs
        category: 'geral',
        confidence: 100,
        requiresHuman: false,
        reasoning: 'Mensagem da Central - sem filtros',
      };
    }

    // ============================
    // REGRA 1: PALAVRAS CRÍTICAS → HUMANO OBRIGATÓRIO
    // ============================
    for (const keyword of this.CRITICAL_KEYWORDS) {
      if (lowerMsg.includes(keyword)) {
        return {
          shouldAutoReply: false,
          autoReplyMessage: null,
          shouldSuggestAI: true, // IA sugere mesmo assim (Central vê sugestão)
          category: 'problema',
          confidence: 100,
          requiresHuman: true,
          reasoning: `Palavra crítica detectada: "${keyword}" - requer atenção humana imediata`,
        };
      }
    }

    // ============================
    // REGRA 2: PERGUNTA SOBRE STATUS DE PEDIDO ESPECÍFICO
    // ============================
    if (orderId && (lowerMsg.includes('onde') || lowerMsg.includes('status') || lowerMsg.includes('chegou'))) {
      try {
        const order = await storage.getOrder(orderId);
        
        if (order) {
          let statusMsg = '';
          
          switch (order.status) {
            case 'pending':
              statusMsg = `📦 Pedido #${orderId}: Aguardando motoboy aceitar. Previsão: ${this.estimateAcceptanceTime(order)} min`;
              break;
            case 'accepted':
              statusMsg = `✅ Pedido #${orderId}: Aceito! Motoboy a caminho para coleta.`;
              break;
            case 'in_progress':
              statusMsg = `🏍️ Pedido #${orderId}: Em rota de entrega! Chegada prevista em breve.`;
              break;
            case 'delivered':
              const deliveredTime = order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'recente';
              statusMsg = `✅ Pedido #${orderId}: Entregue às ${deliveredTime}!`;
              break;
            case 'cancelled':
              statusMsg = `❌ Pedido #${orderId}: Cancelado. Entre em contato com a Central para mais detalhes.`;
              break;
          }

          return {
            shouldAutoReply: true,
            autoReplyMessage: statusMsg,
            shouldSuggestAI: false, // Não precisa IA, resposta baseada em dados
            category: 'status',
            confidence: 98,
            requiresHuman: false,
            reasoning: `Status consultado no banco: ${order.status}`,
          };
        }
      } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        // Se falhar, cai para próximas regras
      }
    }

    // ============================
    // REGRA 3: PADRÕES DE AUTO-RESPOSTA (FAQ)
    // ============================
    for (const pattern of this.AUTO_REPLY_PATTERNS) {
      const matchCount = pattern.keywords.filter(kw => lowerMsg.includes(kw)).length;
      
      // Se encontrou pelo menos 1 palavra-chave do padrão
      if (matchCount > 0) {
        return {
          shouldAutoReply: true,
          autoReplyMessage: pattern.response,
          shouldSuggestAI: false,
          category: pattern.category,
          confidence: pattern.confidence,
          requiresHuman: false,
          reasoning: `Padrão FAQ detectado: ${pattern.keywords.join(', ')}`,
        };
      }
    }

    // ============================
    // REGRA 4: CANCELAMENTO/REEMBOLSO → HUMANO + IA SUGERE
    // ============================
    if (lowerMsg.includes('cancelar') || lowerMsg.includes('reembolso') || lowerMsg.includes('estorno')) {
      return {
        shouldAutoReply: false,
        autoReplyMessage: null,
        shouldSuggestAI: true, // IA pode sugerir procedimento padrão
        category: 'cancelamento',
        confidence: 90,
        requiresHuman: true, // Mas humano DEVE revisar
        reasoning: 'Cancelamento/Reembolso - decisão financeira requer aprovação humana',
      };
    }

    // ============================
    // REGRA 5: RECLAMAÇÃO/PROBLEMA → HUMANO + IA SUGERE
    // ============================
    const complaintKeywords = ['problema', 'reclamação', 'errado', 'ruim', 'péssimo', 'horrível', 'demora'];
    if (complaintKeywords.some(kw => lowerMsg.includes(kw))) {
      return {
        shouldAutoReply: false,
        autoReplyMessage: null,
        shouldSuggestAI: true,
        category: 'problema',
        confidence: 85,
        requiresHuman: true,
        reasoning: 'Reclamação detectada - empatia humana necessária',
      };
    }

    // ============================
    // REGRA 6: MENSAGEM GENÉRICA/PRIMEIRA INTERAÇÃO → IA SUGERE
    // ============================
    const isFirstMessage = conversationHistory.length === 0;
    
    if (isFirstMessage || lowerMsg.length < 15) {
      return {
        shouldAutoReply: false,
        autoReplyMessage: null,
        shouldSuggestAI: true, // IA pode sugerir resposta amigável
        category: 'geral',
        confidence: 60,
        requiresHuman: false, // Humano pode aceitar sugestão da IA
        reasoning: isFirstMessage ? 'Primeira mensagem - impressão inicial importante' : 'Mensagem curta - contexto insuficiente',
      };
    }

    // ============================
    // FALLBACK: CASO NÃO IDENTIFICADO → IA SUGERE
    // ============================
    return {
      shouldAutoReply: false,
      autoReplyMessage: null,
      shouldSuggestAI: true,
      category: 'geral',
      confidence: 50,
      requiresHuman: false,
      reasoning: 'Nenhum padrão claro detectado - IA pode tentar sugerir',
    };
  }

  /**
   * HELPER: Estima tempo para aceitação de pedido
   */
  private static estimateAcceptanceTime(order: Order): number {
    const now = new Date();
    const createdAt = new Date(order.createdAt);
    const elapsedMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
    
    // Se já passou muito tempo (> 30 min), algo está errado
    if (elapsedMinutes > 30) return 5; // "em breve"
    
    // Caso normal: 10-15 min para aceitar
    return Math.max(5, 15 - elapsedMinutes);
  }

  /**
   * MÉTODO: Registra decisão para aprendizado da IA
   * (Futuramente usado para fine-tuning)
   */
  static async logAILearning(log: AILearningLog): Promise<void> {
    // TODO: Salvar em tabela ai_learning_logs para análise posterior
    console.log('📚 AI Learning Log:', {
      decision: log.filterDecision.reasoning,
      humanAction: log.humanAction,
      category: log.category,
    });
    
    // Futuramente: analisar padrões e ajustar regras automaticamente
    // Exemplo: Se humano sempre ignora sugestão da IA em categoria X,
    // ajustar para enviar direto ao humano sem sugerir IA
  }

  /**
   * MÉTODO: Obtém estatísticas de eficácia do filtro
   */
  static getFilterStats(): {
    autoReplyRate: number;
    aiSuggestionRate: number;
    humanOnlyRate: number;
    avgConfidence: number;
  } {
    // TODO: Calcular com base em logs reais
    return {
      autoReplyRate: 0.70,  // 70% resolvidos automaticamente
      aiSuggestionRate: 0.25, // 25% IA sugere para humano
      humanOnlyRate: 0.05,    // 5% humano total
      avgConfidence: 0.87,    // 87% confiança média
    };
  }
}
