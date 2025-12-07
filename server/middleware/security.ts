/**
 * Security Middleware - Integração do módulo de segurança com Express
 * 
 * Como usar:
 * 1. Importar no server/app.ts
 * 2. Adicionar app.use(securityMiddleware)
 * 3. Usar securityAnalyzers.auth.recordLoginAttempt() em endpoints de login
 */

import type { Request, Response, NextFunction } from 'express';

// Singleton para manter instância dos analyzers
let securityAnalyzers: any = null;

export function setSecurityAnalyzers(analyzers: any): void {
  securityAnalyzers = analyzers;
}

/**
 * Middleware principal de monitoramento de segurança
 */
export function securityMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!securityAnalyzers?.traffic) {
    // Se módulo não inicializado, apenas passe adiante
    return next();
  }

  const startTime = Date.now();

  // Interceptar resposta para analisar após conclusão
  const originalSend = res.send;
  res.send = function (body: any): Response {
    const duration = Date.now() - startTime;
    
    // Analisar requisição/resposta
    try {
      securityAnalyzers.traffic.analyzeRequest(req, res, duration);
    } catch (error) {
      console.error('[SecurityMiddleware] Erro ao analisar tráfego:', error);
    }
    
    return originalSend.call(this, body);
  };

  next();
}

/**
 * Wrapper para endpoints de autenticação
 * 
 * Exemplo:
 * app.post('/auth/login', withAuthMonitoring(async (req, res) => {
 *   const { email, senha } = req.body;
 *   try {
 *     const user = await authenticateUser(email, senha);
 *     res.json({ success: true, user });
 *   } catch (error) {
 *     res.status(401).json({ success: false });
 *   }
 * }));
 */
export function withAuthMonitoring(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    const email = req.body?.email || req.body?.username;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    try {
      await handler(req, res);
      
      // Se chegou aqui e status é 200-299, consideramos sucesso
      const success = res.statusCode >= 200 && res.statusCode < 300;
      
      if (securityAnalyzers?.auth) {
        securityAnalyzers.auth.recordLoginAttempt(ip, email, success);
      }
    } catch (error) {
      // Login falhou
      if (securityAnalyzers?.auth) {
        securityAnalyzers.auth.recordLoginAttempt(ip, email, false);
      }
      throw error;
    }
  };
}

/**
 * Wrapper para chamadas de dependências externas (OpenAI, DB, etc.)
 * 
 * Exemplo:
 * const response = await withDependencyMonitoring(
 *   'openai',
 *   () => openai.chat.completions.create(...)
 * );
 */
export async function withDependencyMonitoring<T>(
  serviceName: 'openai' | 'database' | 'payment',
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Registrar falha no analyzer
    if (securityAnalyzers?.dependency) {
      if (serviceName === 'openai') {
        securityAnalyzers.dependency.recordOpenAIFailure(error, error.status || error.statusCode);
      } else if (serviceName === 'database') {
        securityAnalyzers.dependency.recordDatabaseFailure(error);
      } else if (serviceName === 'payment') {
        const gateway = error.gateway || 'stripe'; // ou extrair do contexto
        securityAnalyzers.dependency.recordPaymentGatewayFailure(gateway, error, error.status);
      }
    }
    
    throw error; // Re-lançar para tratamento normal
  }
}

/**
 * Emitir evento de segurança customizado
 * 
 * Exemplo:
 * emitSecurityEvent({
 *   tipo: 'configuracao-insegura',
 *   origem: 'api-validation',
 *   severidade: 'media',
 *   timestamp: new Date(),
 *   dados: { secret_exposed: true },
 *   contexto: { endpoint: '/api/config' }
 * });
 */
export function emitSecurityEvent(event: any): void {
  if (!securityAnalyzers) return;
  
  // Importar event bus dinamicamente para evitar erro se não inicializado
  try {
    const { securityEventBus } = require('../.agent/security/events/security-event-bus.js');
    securityEventBus.emit('security-event', event);
  } catch (error) {
    console.error('[SecurityMiddleware] Erro ao emitir evento:', error);
  }
}

/**
 * Obter estatísticas de segurança
 */
export function getSecurityStats() {
  if (!securityAnalyzers) {
    return { enabled: false };
  }

  return {
    enabled: true,
    auth: securityAnalyzers.auth?.getIPStats('0.0.0.0'), // exemplo
    dependency: {
      openai: securityAnalyzers.dependency?.getServiceHealth('openai'),
      database: securityAnalyzers.dependency?.getServiceHealth('database')
    }
  };
}
