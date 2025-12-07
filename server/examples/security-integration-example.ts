/**
 * Exemplo de integração do módulo de segurança Agent Zero com Guriri Express
 * 
 * Este arquivo mostra como conectar o Security Module aos endpoints existentes.
 * Copie os trechos necessários para server/app.ts e server/routes.ts
 */

import express from 'express';
import type { Express } from 'express';

// ============================================================================
// 1. IMPORTAÇÕES NO TOPO DO server/app.ts
// ============================================================================

import { 
  securityMiddleware, 
  setSecurityAnalyzers, 
  withAuthMonitoring,
  withDependencyMonitoring
} from './middleware/security.js';

// ============================================================================
// 2. REGISTRAR MIDDLEWARE GLOBAL (depois de express.json())
// ============================================================================

export function setupSecurityIntegration(app: Express, agentZero: any): void {
  // Obter analyzers do Agent Zero (se inicializado)
  const analyzers = agentZero?.getSecurityAnalyzers?.();
  
  if (analyzers) {
    setSecurityAnalyzers(analyzers);
    app.use(securityMiddleware);
    console.log('🛡️  Security middleware ativado\n');
  }
}

// ============================================================================
// 3. MONITORAR ENDPOINTS DE AUTENTICAÇÃO
// ============================================================================

// ANTES (sem monitoramento):
// app.post('/auth/login', async (req, res) => {
//   const { email, senha } = req.body;
//   try {
//     const user = await authenticateUser(email, senha);
//     res.json({ success: true, user });
//   } catch (error) {
//     res.status(401).json({ success: false });
//   }
// });

// DEPOIS (com monitoramento):
app.post('/auth/login', withAuthMonitoring(async (req, res) => {
  const { email, senha } = req.body;
  
  try {
    const user = await authenticateUser(email, senha);
    res.json({ success: true, user });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Credenciais inválidas' });
  }
}));

// ============================================================================
// 4. MONITORAR CHAMADAS OPENAI (em server/ai-engine.ts)
// ============================================================================

import { withDependencyMonitoring } from './middleware/security.js';

// ANTES:
// const completion = await this.openai.chat.completions.create({
//   model: 'gpt-4o-mini',
//   messages: [...]
// });

// DEPOIS:
const completion = await withDependencyMonitoring('openai', () =>
  this.openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [...]
  })
);

// ============================================================================
// 5. MONITORAR QUERIES DE BANCO (em server/db.ts)
// ============================================================================

// ANTES:
// const pedidos = await db.select().from(orders);

// DEPOIS:
const pedidos = await withDependencyMonitoring('database', () =>
  db.select().from(orders)
);

// ============================================================================
// 6. ENDPOINT DE STATUS DE SEGURANÇA
// ============================================================================

import { getSecurityStats } from './middleware/security.js';

app.get('/api/security/status', (req, res) => {
  const stats = getSecurityStats();
  res.json(stats);
});

// ============================================================================
// 7. INICIALIZAR AGENT ZERO COM MÓDULO DE SEGURANÇA
// ============================================================================

// Em server/index.ts (se Agent Zero roda junto com o servidor):
import { AgentZero } from '../.agent/index.js';

const agentZero = new AgentZero();
await agentZero.start();

// Conectar analyzers ao Express
setupSecurityIntegration(app, agentZero);

// ============================================================================
// 8. EXEMPLO COMPLETO: server/app.ts MODIFICADO
// ============================================================================

/*
import express from 'express';
import { setupSecurityIntegration, securityMiddleware } from './middleware/security.js';

const app = express();

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware (se Agent Zero estiver rodando)
if (process.env.ENABLE_AGENT_ZERO === 'true') {
  const { AgentZero } = await import('../.agent/index.js');
  const agentZero = new AgentZero();
  setupSecurityIntegration(app, agentZero);
}

// ... resto das rotas

export default app;
*/

// ============================================================================
// 9. EMITIR EVENTO DE SEGURANÇA CUSTOMIZADO
// ============================================================================

import { emitSecurityEvent } from './middleware/security.js';

// Exemplo: detectar secret exposto em logs
function sanitizeLog(data: any): void {
  if (typeof data === 'string' && data.includes('sk-')) {
    emitSecurityEvent({
      tipo: 'configuracao-insegura',
      origem: 'log-sanitizer',
      severidade: 'alta',
      timestamp: new Date(),
      dados: {
        tipo_vazamento: 'openai_api_key',
        local: 'application_log'
      },
      contexto: {
        acao_tomada: 'Log suprimido'
      }
    });
  }
}

// ============================================================================
// 10. FALLBACK PARA OPENAI COM MONITORAMENTO
// ============================================================================

import { withDependencyMonitoring } from './middleware/security.js';

async function callOpenAIWithFallback(prompt: string): Promise<string> {
  try {
    const response = await withDependencyMonitoring('openai', () =>
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
      })
    );
    
    return response.choices[0].message.content || '';
  } catch (error: any) {
    // Security module já registrou a falha
    
    // Implementar fallback
    if (error.status === 429) {
      console.log('⚠️  Rate limit OpenAI - usando resposta em cache');
      return getCachedResponse(prompt);
    } else if (error.status === 403) {
      console.log('❌ OpenAI 403 - credenciais inválidas');
      return 'Serviço temporariamente indisponível';
    }
    
    throw error;
  }
}

// ============================================================================
// RESUMO DE INTEGRAÇÃO
// ============================================================================

/*

CHECKLIST DE INTEGRAÇÃO:

[ ] 1. Copiar server/middleware/security.ts para o projeto
[ ] 2. Importar securityMiddleware em server/app.ts
[ ] 3. Adicionar app.use(securityMiddleware) após express.json()
[ ] 4. Configurar security.enabled: true em .agent/config.json
[ ] 5. Envolver endpoints de login com withAuthMonitoring()
[ ] 6. Envolver chamadas OpenAI com withDependencyMonitoring('openai')
[ ] 7. Envolver queries DB com withDependencyMonitoring('database')
[ ] 8. Testar: npm run agent:start (Agent Zero com security)
[ ] 9. Verificar logs: deve aparecer "🛡️ Security Agent ativado"
[ ] 10. Simular ataque de brute force para testar detecção

VARIÁVEIS DE AMBIENTE NECESSÁRIAS:

OPENAI_API_KEY=sk-...        # Para análise com IA
ENABLE_AGENT_ZERO=true        # Ativar Agent Zero
NODE_ENV=production           # Para produção

ENDPOINTS DE TESTE:

GET  /api/security/status     # Ver status dos analyzers
POST /auth/login              # Testar auth monitoring
POST /chat/resolve            # Testar OpenAI monitoring

*/

export {};
