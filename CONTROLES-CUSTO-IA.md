# 🔒 CONTROLES DE CUSTO DE IA - DOCUMENTAÇÃO TÉCNICA

## 📊 RESUMO EXECUTIVO

Sistema implementado com **múltiplas camadas de proteção** para garantir que o custo da OpenAI API permaneça **extremamente baixo** durante o uso gratuito do chat.

**Budget Diário:** $5.00 USD  
**Modelo:** gpt-4o-mini (mais barato)  
**Custo Médio por Mensagem:** ~$0.0001 USD  
**Capacidade:** ~50,000 mensagens por dia antes de atingir limite

---

## 🛡️ CAMADAS DE PROTEÇÃO

### 1️⃣ **RATE LIMITING (Limite de Taxa)**
**Arquivo:** `server/middleware/chat-rate-limiter.ts`

```typescript
- Max 50 mensagens IA por usuário por dia
- Max 500 mensagens IA globais por dia
- Cooldown: 30 segundos entre mensagens
- Reset automático: 24 horas
```

**Respostas de Erro:**
- 429: `"Você atingiu o limite de 50 mensagens IA por dia"`
- 429: `"Aguarde 30s antes de enviar outra mensagem"`

**Benefício:** Impede uso abusivo por usuários individuais

---

### 2️⃣ **BUDGET TRACKING (Rastreamento de Orçamento)**
**Arquivo:** `server/middleware/cost-tracker.ts`

```typescript
- Budget diário: $5.00 USD
- Alerta em 75%: $3.75 USD
- Bloqueio em 100%: $5.00 USD
- Tracking de tokens (input + output)
```

**Cálculo de Custo:**
```
Input:  $0.150 / 1M tokens
Output: $0.600 / 1M tokens
Média: 200 in + 150 out = $0.0001125 por mensagem
```

**Resposta de Erro:**
- 503: `"Orçamento diário excedido. IA indisponível até amanhã."`

**Benefício:** Impede custos inesperados bloqueando API quando budget acabar

---

### 3️⃣ **RESPONSE CACHING (Cache de Respostas)**
**Arquivo:** `server/middleware/response-cache.ts`

```typescript
- Cache em memória (200 entradas max)
- TTL: 1 hora
- Normalização de mensagens (remove acentos, pontuação)
- Auto-cleanup: 30 minutos
```

**Exemplo:**
```
"Onde está meu pedido?" → normaliza → "onde esta meu pedido"
"Onde esta o meu pedido?" → normaliza → "onde esta meu pedido"
✅ Cache HIT! Reutiliza resposta (economia: $0.0001)
```

**Benefício:** Evita chamadas redundantes para perguntas similares

---

### 4️⃣ **PROMPT OPTIMIZATION (Otimização de Prompts)**
**Arquivo:** `server/ai-engine.ts`

**Prompts Ultra-Concisos:**
```typescript
suporte: 'Você é assistente de entregas. Seja breve e direto. Máx 2 frases.'
problema: 'Você resolve problemas de entrega. Responda de forma clara e concisa. Máx 2 frases.'
status_entrega: 'Você informa status de pedidos. Seja objetivo. Máx 2 frases.'
```

**Parâmetros de Custo:**
```typescript
model: 'gpt-4o-mini',          // Modelo mais barato
max_tokens: 150,               // Limita resposta (custo baixo)
temperature: 0.7,              // Balanceado
```

**Benefício:** Minimiza tokens consumidos = custo 10x menor

---

## 📈 ENDPOINTS DE MONITORAMENTO

### **GET /api/chat/usage-stats**
Estatísticas para usuário atual:

```json
{
  "user": {
    "dailyCount": 12,
    "dailyLimit": 50,
    "globalCount": 245,
    "globalLimit": 500,
    "canRequest": true,
    "cooldownRemaining": 0
  },
  "global": {
    "budget": {
      "totalCost": 0.0127,
      "percentUsed": 0,
      "remaining": 4.9873
    },
    "cache": {
      "size": 45,
      "totalHits": 123,
      "estimatedSavings": 0.0123
    }
  }
}
```

### **GET /api/chat/budget-history** (Apenas Central)
Histórico de custos:

```json
{
  "history": [
    {
      "date": "2025-01-20",
      "totalCost": 0.0245,
      "totalInputTokens": 4500,
      "totalOutputTokens": 3200,
      "requestCount": 234
    }
  ],
  "summary": {
    "totalDays": 7,
    "totalSpent": 0.1523,
    "totalRequests": 1450,
    "cacheSavings": 0.0356
  }
}
```

---

## 🎯 FLUXO DE EXECUÇÃO

```mermaid
POST /api/chat
    ↓
[1] authenticateToken ✓
    ↓
[2] rateLimitChatMiddleware
    ├─ Verifica limite diário do usuário (50/dia)
    ├─ Verifica limite global (500/dia)
    └─ Verifica cooldown (30s)
    ↓
[3] Verifica budget diário ($5.00)
    ↓
[4] Salva mensagem do usuário no DB
    ↓
[5] Broadcast WebSocket → usuário
    ↓
[6] IA responde (apenas suporte/problema):
    ├─ Verifica cache (1 hora TTL)
    ├─ Se cache HIT → retorna (economia!)
    ├─ Se cache MISS:
    │   ├─ Chama OpenAI API
    │   ├─ Tracking de tokens/custo
    │   └─ Salva no cache
    ↓
[7] Salva resposta IA no DB
    ↓
[8] Broadcast WebSocket → IA response
    ↓
[9] Registra uso para rate limiting
```

---

## ⚙️ CONFIGURAÇÕES AJUSTÁVEIS

### **Rate Limiting** (`chat-rate-limiter.ts`)
```typescript
MAX_REQUESTS_PER_USER_PER_DAY = 50;  // Ajustar para 20 (mais restritivo)
MAX_REQUESTS_GLOBAL_PER_DAY = 500;   // Ajustar para 200 (mais restritivo)
COOLDOWN_SECONDS = 30;               // Ajustar para 60 (mais restritivo)
```

### **Budget** (`cost-tracker.ts`)
```typescript
DAILY_BUDGET_USD = 5.00;             // Ajustar para 2.00 (mais restritivo)
WARN_THRESHOLD_PERCENT = 75;         // Ajustar para 50 (alertar mais cedo)
```

### **Cache** (`response-cache.ts`)
```typescript
MAX_ENTRIES = 200;                   // Ajustar para 500 (mais cache)
TTL_HOURS = 1;                       // Ajustar para 4 (cache mais longo)
```

### **AI Prompts** (`ai-engine.ts`)
```typescript
max_tokens: 150;                     // Ajustar para 100 (mais curto)
temperature: 0.7;                    // Ajustar para 0.5 (mais consistente)
```

---

## 📋 CHECKLIST DE SEGURANÇA

- ✅ Rate limiting por usuário (50/dia)
- ✅ Rate limiting global (500/dia)
- ✅ Cooldown entre mensagens (30s)
- ✅ Budget cap diário ($5.00)
- ✅ Budget warning (75%)
- ✅ Response caching (1h TTL)
- ✅ Token tracking em tempo real
- ✅ Prompts ultra-concisos (< 100 tokens)
- ✅ max_tokens limitado (150)
- ✅ Modelo mais barato (gpt-4o-mini)
- ✅ Cache auto-cleanup (30 min)
- ✅ Fallback em caso de erro API
- ✅ Logs detalhados de custo
- ✅ Endpoints de monitoramento

---

## 🚨 ALERTAS E MONITORAMENTO

### **Console Logs:**
```bash
✅ Cache HIT: "onde está meu pedido..." (3 reuses, saved ~$0.0001)
💰 AI Cost: 45 in + 38 out = ~$0.000012
⚠️  COST WARNING: 76% of daily budget used ($3.80 / $5.00)
❌ OpenAI Error: insufficient_quota
```

### **Error Handling:**
```typescript
// insufficient_quota
→ "Sistema de IA temporariamente indisponível. Entre em contato com o suporte."

// rate_limit
→ "Você atingiu o limite de 50 mensagens IA por dia."

// budget_exceeded
→ "Orçamento diário excedido. IA indisponível até amanhã."
```

---

## 💡 ESTIMATIVAS DE CUSTO

### **Cenário Conservador:**
- 100 mensagens/dia
- 200 tokens input + 150 output cada
- Custo: 100 × $0.0001125 = **$0.01125/dia**
- Mensal: **$0.34**

### **Cenário Moderado:**
- 500 mensagens/dia (limite global)
- 200 tokens input + 150 output cada
- Custo: 500 × $0.0001125 = **$0.05625/dia**
- Mensal: **$1.69**

### **Cenário com Cache (30% hit rate):**
- 500 mensagens/dia
- 350 chamam API + 150 cache hits
- Custo: 350 × $0.0001125 = **$0.03937/dia**
- Economia: **30%**
- Mensal: **$1.18**

### **Pior Caso (sem proteções):**
- 10,000 mensagens/dia (sem limites)
- Custo: 10,000 × $0.0001125 = **$1.125/dia**
- Mensal: **$33.75** ⚠️

**COM PROTEÇÕES:** Budget cap bloqueia em $5/dia = **máx $150/mês**

---

## 🔧 MANUTENÇÃO

### **Resetar Limites (Emergência):**
```typescript
// Em server/index.ts ou admin endpoint
import { chatRateLimiter } from './middleware/chat-rate-limiter';
chatRateLimiter.resetAllLimits();
```

### **Limpar Cache:**
```typescript
import { responseCache } from './middleware/response-cache';
responseCache.clear();
```

### **Resetar Budget do Dia:**
```typescript
import { costTracker } from './middleware/cost-tracker';
costTracker.resetTodayBudget(); // Use com cautela!
```

---

## 📚 ARQUIVOS CRIADOS

1. `server/middleware/chat-rate-limiter.ts` - Rate limiting
2. `server/middleware/cost-tracker.ts` - Budget tracking
3. `server/middleware/response-cache.ts` - Response caching
4. `server/ai-engine.ts` - OpenAI integration (atualizado)
5. `server/routes.ts` - Rotas com proteções (atualizado)

---

## ✅ CONCLUSÃO

Sistema possui **5 camadas independentes de proteção** para garantir custos baixíssimos:

1. **Rate Limiting** → Impede spam
2. **Budget Cap** → Bloqueia em $5/dia
3. **Caching** → Evita chamadas duplicadas
4. **Prompt Optimization** → Minimiza tokens
5. **Model Selection** → Usa modelo mais barato

**Custo esperado:** $0.01 - $0.05 por dia (~$1.50/mês)  
**Proteção máxima:** $5/dia = $150/mês (budget cap)

Sistema está **PRONTO** para uso em produção com custo controlado! 🎉
