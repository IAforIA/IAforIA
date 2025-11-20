/**
 * ARQUIVO: server/index.ts
 * PROPÓSITO: Ponto de entrada principal do servidor backend
 * 
 * Este arquivo configura e inicializa:
 * - Express app (servidor HTTP)
 * - Middlewares de segurança (Helmet, CORS)
 * - WebSocket server para comunicação em tempo real
 * - Vite dev server (desenvolvimento) ou arquivos estáticos (produção)
 */

// CRÍTICO: Carregar variáveis de ambiente PRIMEIRO
// dotenv/config lê o arquivo .env e injeta as variáveis em process.env
import 'dotenv/config';

// Express: Framework web para Node.js - cria rotas HTTP e middlewares
import express, { type Request, Response, NextFunction } from "express";
// Helmet: Middleware de segurança - define headers HTTP seguros
import helmet from "helmet";
// CORS: Middleware que permite requisições de diferentes origens (cross-origin)
import cors from "cors";

// IMPORTANTE: Usamos extensão .ts explícita para garantir que o bundler resolva os arquivos fonte
// registerRoutes: Função que registra todas as rotas da API (definida em routes.ts)
import { registerRoutes } from "./routes.ts"; 
// setupVite: Configura Vite dev server | serveStatic: Serve arquivos build | log: Função de logging
import { setupVite, serveStatic, log } from "./vite.ts";
// createServer: Cria servidor HTTP nativo do Node.js
import { createServer } from "http";
// WebSocket: Biblioteca para comunicação bidirecional em tempo real
import { WebSocketServer, WebSocket } from "ws";
// verifyTokenFromQuery: Valida JWT token passado como query parameter no WebSocket
import { verifyTokenFromQuery } from "./middleware/auth.ts";

// VARIÁVEL GLOBAL: Instância do Express application
// Usada para registrar middlewares e rotas
const app = express();

// VARIÁVEL GLOBAL: Servidor HTTP (pode ser undefined antes da inicialização)
// ReturnType<typeof createServer> = tipo retornado pela função createServer
let httpServer: ReturnType<typeof createServer> | undefined;
let wsServer: ReturnType<typeof createServer> | undefined;

declare module 'http' {
  interface IncomingMessage {
    rawBody: Buffer;
  }
}

// ========================================
// MIDDLEWARES DE SEGURANÇA
// ========================================

// SEGURANÇA: Helmet - Headers HTTP seguros
// Previne ataques comuns (XSS, clickjacking, etc) configurando headers automaticamente
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
  crossOriginEmbedderPolicy: false, // Necessário para Vite HMR (Hot Module Replacement) funcionar em dev
}));

// SEGURANÇA: CORS - Controle de origens permitidas
// Define quais domínios podem fazer requisições ao servidor
// VARIÁVEL: allowedOrigins - Array de URLs permitidas (vem de .env ou usa defaults)
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000', 'http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    // Permite requests sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === "production") {
      return callback(new Error('CORS policy: Origin not allowed'), false);
    }
    callback(null, true);
  },
  credentials: true,
}));

app.use(express.json({
  limit: '10mb', // SEGURANÇA: Limita tamanho do payload
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

// ========================================
// WEBSOCKET - COMUNICAÇÃO EM TEMPO REAL
// ========================================

// VARIÁVEL GLOBAL: Map que armazena todas as conexões WebSocket ativas
// Chave: userId (string) | Valor: WebSocket connection
// Permite enviar mensagens para usuários específicos
const wsClients = new Map<string, WebSocket>();

/**
 * FUNÇÃO EXPORTADA: broadcast
 * PROPÓSITO: Envia mensagem para todos os clientes WebSocket conectados
 * 
 * @param message - Objeto com dados a enviar (será convertido para JSON)
 * @param excludeId - (Opcional) ID do usuário que NÃO deve receber a mensagem
 * 
 * USADO EM: routes.ts - para notificar dashboards sobre novos pedidos/atualizações
 */
export function broadcast(message: any, excludeId?: string) {
  // VARIÁVEL LOCAL: Converte objeto message para string JSON
  const data = JSON.stringify(message);
  
  // Itera sobre todos os clientes conectados
  wsClients.forEach((ws, id) => {
    // Envia apenas se:
    // 1. Não for o usuário excluído (excludeId)
    // 2. Conexão estiver aberta (readyState === OPEN)
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function startWebSocketServer(host: string) {
  if (wsServer) {
    return;
  }

  const wsPort = parseInt(process.env.WS_PORT || '5001', 10);
  wsServer = createServer();

  const wss = new WebSocketServer({
    server: wsServer,
    path: '/ws',
  });

  wss.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams(req.url?.split('?')[1] || '');
    const token = urlParams.get('token');
    const user = verifyTokenFromQuery(token);

    if (!user) {
      ws.terminate();
      return;
    }

    wsClients.set(user.id, ws);
    log(`WebSocket connected: ${user.id} (${user.role})`, 'ws');

    ws.on('close', () => {
      wsClients.delete(user.id);
      log(`WebSocket disconnected: ${user.id}`, 'ws');
    });
  });

  wsServer.listen({ port: wsPort, host }, () => {
    log(`WebSocket server listening on port ${wsPort}`, 'ws');
  });
}

(async () => {
  const apiRouter = await registerRoutes();
  app.use(apiRouter);

  // SEGURANÇA: Error handler que não expõe detalhes em produção
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // Log completo do erro (para debugging interno)
    console.error('[ERROR]', {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });

    const status = (err as any).status || (err as any).statusCode || 500;
    
    // Em produção: mensagem genérica para não expor detalhes internos
    if (process.env.NODE_ENV === "production") {
      res.status(status).json({ 
        error: status === 500 ? "Internal server error" : err.message,
        status
      });
    } else {
      // Em desenvolvimento: mensagem completa para debugging
      res.status(status).json({ 
        error: err.message,
        status,
        stack: err.stack 
      });
    }
  });

  const port = parseInt(process.env.PORT || '5000', 10);
  const host = "0.0.0.0";

  if (process.env.NODE_ENV === "development") {
    httpServer = createServer(app);
    
    log(`Starting Vite setup...`);
    await setupVite(app, httpServer);
    log(`Vite setup complete!`);
    startWebSocketServer(host);

    httpServer.listen({ port, host }, () => {
        log(`serving in development on port ${port}`);
    });

  } else {
    serveStatic(app);
    httpServer = createServer(app);
    startWebSocketServer(host);

    httpServer.listen({ port, host }, () => {
        log(`serving in production on port ${port}`);
    });
  }
})();
