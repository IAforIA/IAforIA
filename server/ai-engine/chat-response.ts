import OpenAI from "openai";
import { costTracker } from "../middleware/cost-tracker.js";
import { responseCache } from "../middleware/response-cache.js";

const SYSTEM_PROMPTS: Record<string, string> = {
  suporte: "Você é assistente de entregas. Seja breve e direto. Máx 2 frases.",
  problema: "Você resolve problemas de entrega. Responda de forma clara e concisa. Máx 2 frases.",
  status_entrega: "Você informa status de pedidos. Seja objetivo. Máx 2 frases.",
};

export async function generateChatResponse(message: string, category: string, userId: string): Promise<string> {
  try {
    const systemPrompt = SYSTEM_PROMPTS[category] || SYSTEM_PROMPTS.suporte;

    const hasApiKey = Boolean(process.env.OPENAI_API_KEY);

    // Quando há API key, sempre consulta a IA (não usa cache para evitar stuck em resposta antiga)
    // Quando não há key, gera fallback local sem cache para poder atualizar assim que a key aparecer.
    if (!hasApiKey) {
      return buildFallback(message, category);
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const mode = process.env.OPENAI_MODE || "comunicacao";
    const finetunedModel = mode === "acao"
      ? process.env.OPENAI_FINETUNED_MODEL_CEO
      : process.env.OPENAI_FINETUNED_MODEL_COMUNICACAO;
    const baseFallbackModel = process.env.OPENAI_BASE_MODEL || "gpt-4o-mini";

    const tryModels = [finetunedModel, baseFallbackModel].filter(Boolean) as string[];

    let completion;
    let lastError: any = null;

    for (const model of tryModels) {
      try {
        completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          max_tokens: 150,
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        });
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
        // Se for erro de acesso ao modelo (403), tenta o próximo modelo da lista
        if (err?.status === 403 || String(err?.message || '').includes('does not have access to model')) {
          console.warn(`🔁 OpenAI fallback: ${model} bloqueado, tentando próximo modelo...`);
          continue;
        }
        // Outros erros: lança para cair no catch principal
        throw err;
      }
    }

    if (!completion) {
      throw lastError || new Error('Falha ao gerar resposta de IA');
    }

    const usage = completion.usage;
    if (usage) {
      costTracker.recordUsage(usage.prompt_tokens, usage.completion_tokens);
      const cost = costTracker.calculateCost(usage.prompt_tokens, usage.completion_tokens).toFixed(6);
      console.log(`💰 AI Cost: ${usage.prompt_tokens} in + ${usage.completion_tokens} out = ~$${cost}`);
    }

    const aiResponse = completion.choices[0]?.message?.content?.trim()
      || "Desculpe, não consegui gerar uma resposta. Tente novamente.";

    return aiResponse;
  } catch (error: any) {
    console.error("❌ OpenAI Error:", error.message);
    if (error.code === "insufficient_quota") {
      return "Sistema de IA temporariamente indisponível. Entre em contato com o suporte.";
    }
    // Resposta local amigável em caso de exceção (evita resposta repetida genérica)
    return buildFallback(message, category);
  }
}

// Cria resposta curta local baseada em categoria quando IA externa falhar/ausente
function buildFallback(message: string, category: string): string {
  const snippet = message.length > 140 ? `${message.slice(0, 140)}...` : message;
  if (category === "status_entrega") {
    return `Recebido! Vou verificar o status e retorno em seguida. Detalhe: "${snippet}"`;
  }
  if (category === "problema") {
    return `Entendi o problema e vou acionar a equipe. Detalhe: "${snippet}"`;
  }
  return `Mensagem recebida. Vou analisar e responder: "${snippet}"`;
}
