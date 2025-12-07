import express, { Request, Response } from 'express';
import OpenAI from 'openai';
import { appendFileSync } from 'fs';
import { join } from 'path';

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Usar modelo CEO para ações operacionais (JSON estruturado)
const FINETUNED_MODEL_CEO = process.env.OPENAI_FINETUNED_MODEL_CEO || 'gpt-4o-mini';
const CONFIDENCE_THRESHOLD = 0.7;
const FALLBACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

interface ChatRequest {
  message: string;
  context?: {
    orderNumber?: string;
    userName?: string;
    userType?: 'motoboy' | 'estabelecimento';
  };
}

interface ChatResponse {
  reply: string;
  confidence: number;
  needsHuman: boolean;
  intent?: string;
}

// Log de interações
function logInteraction(userType: string, message: string, reply: string, confidence: number) {
  const logPath = join(process.cwd(), 'ai-interactions.log');
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} | ${userType.toUpperCase()} | Confidence: ${confidence.toFixed(2)} | User: "${message}" | AI: "${reply}"\n`;
  
  try {
    appendFileSync(logPath, logEntry, 'utf-8');
  } catch (error) {
    console.error('Erro ao salvar log:', error);
  }
}

// Calcular confiança baseado no logprobs
function calculateConfidence(logprobs: any): number {
  if (!logprobs || !logprobs.content || logprobs.content.length === 0) {
    return 0.5; // Confiança média se não houver logprobs
  }

  // Pegar média dos top logprobs dos primeiros tokens
  const topLogprobs = logprobs.content.slice(0, 5); // Primeiras 5 palavras
  const avgLogprob = topLogprobs.reduce((sum: number, token: any) => {
    return sum + (token.logprob || -1);
  }, 0) / topLogprobs.length;

  // Converter logprob para probabilidade (0-1)
  // logprob de 0 = 100% de confiança, -2 = ~13% de confiança
  const confidence = Math.exp(avgLogprob);
  return Math.min(Math.max(confidence, 0), 1);
}

// Endpoint para Motoboys
app.post('/resolve-motoboy', async (req: Request, res: Response) => {
  try {
    const { message, context }: ChatRequest = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message é obrigatório' });
    }

    console.log(`📱 Motoboy: ${message}`);

    const completion = await openai.chat.completions.create({
      model: FINETUNED_MODEL_CEO,
      messages: [
        {
          role: 'system',
          content: 'Você é a IA da Guriri Express, assistente de motoboys. Seja direto, útil e use linguagem profissional mas acessível.'
        },
        {
          role: 'user',
          content: context ? `${message}\n\nContexto: ${JSON.stringify(context)}` : message
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
      logprobs: true,
      top_logprobs: 2
    });

    const reply = completion.choices[0].message.content || '';
    const confidence = calculateConfidence(completion.choices[0].logprobs);
    const needsHuman = confidence < CONFIDENCE_THRESHOLD;

    console.log(`🤖 IA (${(confidence * 100).toFixed(0)}%): ${reply}`);

    // Log da interação
    logInteraction('motoboy', message, reply, confidence);

    // Se baixa confiança, acionar fallback
    if (needsHuman && FALLBACK_WEBHOOK_URL) {
      // Importar dinamicamente para evitar dependência circular
      const { triggerFallback } = await import('./fallbackWebhook.js');
      await triggerFallback('motoboy', message, reply, confidence, context);
    }

    const response: ChatResponse = {
      reply,
      confidence,
      needsHuman,
      intent: needsHuman ? 'needs_human_review' : 'auto_resolved'
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Erro no endpoint motoboy:', error);
    res.status(500).json({ 
      error: 'Erro ao processar mensagem',
      needsHuman: true 
    });
  }
});

// Endpoint para Estabelecimentos
app.post('/resolve-estab', async (req: Request, res: Response) => {
  try {
    const { message, context }: ChatRequest = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message é obrigatório' });
    }

    console.log(`🏪 Estabelecimento: ${message}`);

    const completion = await openai.chat.completions.create({
      model: FINETUNED_MODEL_CEO,
      messages: [
        {
          role: 'system',
          content: 'Você é a IA da Guriri Express, assistente de estabelecimentos. Seja eficiente, profissional e resolva problemas rapidamente.'
        },
        {
          role: 'user',
          content: context ? `${message}\n\nContexto: ${JSON.stringify(context)}` : message
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
      logprobs: true,
      top_logprobs: 2
    });

    const reply = completion.choices[0].message.content || '';
    const confidence = calculateConfidence(completion.choices[0].logprobs);
    const needsHuman = confidence < CONFIDENCE_THRESHOLD;

    console.log(`🤖 IA (${(confidence * 100).toFixed(0)}%): ${reply}`);

    // Log da interação
    logInteraction('estabelecimento', message, reply, confidence);

    // Se baixa confiança, acionar fallback
    if (needsHuman && FALLBACK_WEBHOOK_URL) {
      const { triggerFallback } = await import('./fallbackWebhook.js');
      await triggerFallback('estabelecimento', message, reply, confidence, context);
    }

    const response: ChatResponse = {
      reply,
      confidence,
      needsHuman,
      intent: needsHuman ? 'needs_human_review' : 'auto_resolved'
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Erro no endpoint estabelecimento:', error);
    res.status(500).json({ 
      error: 'Erro ao processar mensagem',
      needsHuman: true 
    });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    model_ceo: FINETUNED_MODEL_CEO,
    timestamp: new Date().toISOString()
  });
});

// Estatísticas
app.get('/stats', async (req: Request, res: Response) => {
  try {
    const { readFileSync } = await import('fs');
    const logPath = join(process.cwd(), 'ai-interactions.log');
    
    const logs = readFileSync(logPath, 'utf-8').split('\n').filter(l => l.trim());
    
    const stats = {
      totalInteractions: logs.length,
      motoboys: logs.filter(l => l.includes('MOTOBOY')).length,
      estabelecimentos: logs.filter(l => l.includes('ESTABELECIMENTO')).length,
      highConfidence: logs.filter(l => {
        const match = l.match(/Confidence: ([\d.]+)/);
        return match && parseFloat(match[1]) >= CONFIDENCE_THRESHOLD;
      }).length,
      lowConfidence: logs.filter(l => {
        const match = l.match(/Confidence: ([\d.]+)/);
        return match && parseFloat(match[1]) < CONFIDENCE_THRESHOLD;
      }).length
    };

    res.json(stats);
  } catch (error) {
    res.json({ error: 'Nenhuma interação registrada ainda' });
  }
});

const PORT = process.env.AI_CHAT_PORT || 3001;

app.listen(PORT, () => {
  console.log('🚀 Guriri Express AI Chat Server');
  console.log(`📡 Rodando em: http://localhost:${PORT}`);
  console.log(`🤖 Modelo CEO (Ações): ${FINETUNED_MODEL_CEO}`);
  console.log(`📊 Threshold de confiança: ${(CONFIDENCE_THRESHOLD * 100).toFixed(0)}%`);
  console.log(`\n📋 Endpoints disponíveis:`);
  console.log(`   POST /resolve-motoboy - Chat de motoboys`);
  console.log(`   POST /resolve-estab - Chat de estabelecimentos`);
  console.log(`   GET  /health - Status do servidor`);
  console.log(`   GET  /stats - Estatísticas de uso\n`);
});

export default app;
