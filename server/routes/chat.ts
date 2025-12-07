import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.ts';
import { storage } from '../storage.ts';
import { ChatbotFilter } from '../chatbot-filter';
import { broadcast } from '../ws/broadcast.js';
import { chatRateLimiter, recordAIUsage, getUserUsageStats } from '../middleware/chat-rate-limiter';
import { costTracker } from '../middleware/cost-tracker';
import { responseCache } from '../middleware/response-cache';
import { AIEngine } from '../ai-engine.ts';
import logger from '../logger.js';

export function buildChatRouter() {
  const router = Router();

  router.get('/', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      const { threadId } = req.query;
      const allMessages = await storage.getChatMessages();
      let filteredMessages: any[];
      if (userRole === 'central') filteredMessages = allMessages;
      else if (userRole === 'motoboy') filteredMessages = allMessages.filter(msg => msg.senderId === userId || msg.receiverId === userId || (msg.toRole === 'motoboy' && !msg.receiverId));
      else if (userRole === 'client') filteredMessages = allMessages.filter(msg => msg.senderId === userId || msg.receiverId === userId);
      else filteredMessages = [];
      if (threadId) {
        const requestedThread = Array.isArray(threadId) ? threadId[0] : threadId;
        const participantId = requestedThread?.split('_')[0];
        filteredMessages = filteredMessages.filter((msg) => {
          // Prefer exact threadId match when available; fall back to participant-based filter when legacy rows lack threadId
          return msg.threadId === requestedThread || (!!participantId && (msg.senderId === participantId || msg.receiverId === participantId));
        });
      }
      res.json(filteredMessages);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
  });

  router.post('/', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userName = (req as any).user.name;
      const userRole = (req as any).user.role;
      const centralUserId = process.env.CENTRAL_USER_ID || 'central';
      const { message, category, orderId, threadId } = req.body;
      if (!message || message.trim().length === 0) return res.status(400).json({ error: 'Mensagem não pode estar vazia' });
      if (!['status_entrega', 'suporte', 'problema'].includes(category)) return res.status(400).json({ error: 'Categoria inválida' });
      let toId: any = null;
      let toRole = userRole === 'central' ? (req.body.toRole ?? 'client') : 'central';
      if (userRole === 'central' && (req.body.toId || req.body.receiverId)) toId = req.body.toId || req.body.receiverId;
      if (userRole !== 'central') toId = centralUserId;
      if (userRole === 'central' && !toId) return res.status(400).json({ error: 'Destinatário obrigatório para mensagens da Central' });
      const finalThreadId = threadId || `${userId}_${category}`;
      if (req.body.fromId || req.body.toId) {
        res.set('X-Guriri-Legacy-Fields', 'fromId,toId');
        logger.warn('legacy_chat_fields_used', { path: req.path, method: req.method, userId, hasFromId: Boolean(req.body.fromId), hasToId: Boolean(req.body.toId) });
      }
      const chatMessage = {
        senderId: userId,
        senderName: userName,
        senderRole: userRole,
        receiverId: toId,
        toRole,
        category,
        orderId: orderId || null,
        threadId: finalThreadId,
        message: message.trim(),
      } as any;

      const createdMessage = await storage.createChatMessage(chatMessage);
      broadcast({ type: 'chat_message', payload: createdMessage });

      if (userRole !== 'central') {
        const allMessages = await storage.getChatMessages();
        const conversationHistory = allMessages.filter(m => m.threadId === finalThreadId || (m.orderId === orderId && orderId !== null));
        const filterResult = await ChatbotFilter.analyzeMessage(message.trim(), userId, userRole as any, orderId, conversationHistory);
        console.log(`🤖 Filtro: ${filterResult.reasoning} (${filterResult.confidence}% confiança)`);
        if (filterResult.shouldAutoReply && filterResult.autoReplyMessage) {
          const autoReply = {
            senderId: 'system',
            fromId: 'system',
            fromName: 'GuririBot',
            fromRole: 'central',
            receiverId: userId,
            toId: userId,
            toRole: userRole,
            category,
            orderId: orderId || null,
            threadId: finalThreadId,
            message: filterResult.autoReplyMessage,
            isFromCentral: true,
          } as any;
          const autoReplyMessage = await storage.createChatMessage(autoReply);
          broadcast({ type: 'chat_message', payload: autoReplyMessage });
          return res.json({ userMessage: createdMessage, autoReply: autoReplyMessage, filterInfo: { type: 'auto_reply', confidence: filterResult.confidence, category: filterResult.category } });
        }
        if (filterResult.shouldSuggestAI) {
          broadcast({ type: 'chat_ai_suggestion_available', payload: { messageId: createdMessage.id, userId, userName, message: message.trim(), category: filterResult.category, confidence: filterResult.confidence, requiresHuman: filterResult.requiresHuman, reasoning: filterResult.reasoning } });
          return res.json({ userMessage: createdMessage, filterInfo: { type: 'ai_suggestion_pending', confidence: filterResult.confidence, category: filterResult.category, requiresHuman: filterResult.requiresHuman, reasoning: filterResult.reasoning } });
        }
      }
      res.json(createdMessage);
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      res.status(400).json({ error: error.message || 'Erro ao enviar mensagem' });
    }
  });

  router.get('/threads', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      const allMessages = await storage.getChatMessages();
      let userMessages;
      if (userRole === 'central') userMessages = allMessages;
      else userMessages = allMessages.filter(msg => msg.senderId === userId || msg.receiverId === userId);
      const threadsMap = new Map();
      userMessages.forEach((msg: any) => {
        if (!threadsMap.has(msg.threadId)) {
          threadsMap.set(msg.threadId, { threadId: msg.threadId, category: msg.category, orderId: msg.orderId, messages: [], lastMessage: null, unreadCount: 0 });
        }
        const thread = threadsMap.get(msg.threadId);
        thread.messages.push(msg);
        thread.lastMessage = msg;
      });
      const threads = Array.from(threadsMap.values());
      res.json(threads);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar threads' });
    }
  });

  router.post('/ai-suggest', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { message, category, userId } = req.body;
      if (!message || !category) return res.status(400).json({ error: 'message e category são obrigatórios' });
      const rateLimitCheck = chatRateLimiter.canMakeRequest(userId || 'central');
      if (!rateLimitCheck.allowed) return res.status(429).json({ error: rateLimitCheck.reason, retryAfter: rateLimitCheck.retryAfter });
      const budgetCheck = costTracker.canAffordRequest();
      if (!budgetCheck.allowed) return res.status(503).json({ error: budgetCheck.reason, budgetInfo: budgetCheck.budgetInfo });
      const aiSuggestion = await AIEngine.generateChatResponse(message.trim(), category, userId || 'central');
      recordAIUsage(userId || 'central');
      res.json({ suggestion: aiSuggestion });
    } catch (error: any) {
      console.error('❌ AI Suggestion Error:', error);
      res.status(500).json({ error: 'Erro ao gerar sugestão de IA' });
    }
  });

  router.post('/ai-feedback', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { messageId, aiSuggestion, humanResponse, action, category } = req.body;
      if (!messageId || !action) return res.status(400).json({ error: 'messageId e action são obrigatórios' });
      await ChatbotFilter.logAILearning({ messageId, filterDecision: { shouldAutoReply: false, autoReplyMessage: null, shouldSuggestAI: true, category: category || 'geral', confidence: 0, requiresHuman: false, reasoning: 'Feedback humano' }, aiSuggestion, humanResponse, humanAction: action, timestamp: new Date(), category: category || 'geral' });
      console.log(`📚 Feedback registrado: ${action} (categoria: ${category})`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Erro ao registrar feedback:', error);
      res.status(500).json({ error: 'Erro ao registrar feedback' });
    }
  });

  router.get('/usage-stats', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      const userStats = getUserUsageStats(userId);
      const globalStats = userRole === 'central' ? { budget: costTracker.getTodayStats(), cache: responseCache.getStats(), filter: ChatbotFilter.getFilterStats() } : null;
      res.json({ user: userStats, global: globalStats });
    } catch (error: any) {
      console.error('Erro ao buscar stats:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  });

  router.get('/budget-history', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const history = costTracker.getBudgetHistory();
      const cacheStats = responseCache.getStats();
      res.json({ history, cache: cacheStats, summary: { totalDays: history.length, totalSpent: history.reduce((sum: any, day: any) => sum + day.totalCost, 0), totalRequests: history.reduce((sum: any, day: any) => sum + day.requestCount, 0), cacheSavings: cacheStats.estimatedSavings } });
    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error);
      res.status(500).json({ error: 'Erro ao buscar histórico de custos' });
    }
  });

  return router;
}
