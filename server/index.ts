/**
 * ARQUIVO: server/index.ts
 * PROPÃ“SITO: Ponto de entrada principal do servidor backend
 * 
 * Este arquivo configura e inicializa:
 * - Express app (servidor HTTP)
 * - Middlewares de seguranÃ§a (Helmet, CORS)
 * - WebSocket server para comunicaÃ§Ã£o em tempo real
 * - Vite dev server (desenvolvimento) ou arquivos estÃ¡ticos (produÃ§Ã£o)
 */

// CRÃTICO: Carregar variÃ¡veis de ambiente PRIMEIRO
// dotenv/config lÃª o arquivo .env e injeta as variÃ¡veis em process.env
import 'dotenv/config';

// Express: Framework web para Node.js - cria rotas HTTP e middlewares
import express, { type Request, Response, NextFunction } from "express";
// Helmet: Middleware de seguranÃ§a - define headers HTTP seguros
import helmet from "helmet";
// CORS: Middleware que permite requisiÃ§Ãµes de diferentes origens (cross-origin)
import cors from "cors";
// Path: MÃ³dulo do Node.js para manipulaÃ§Ã£o de caminhos de arquivos e diretÃ³rios
import path from "path";

// IMPORTANTE: Usamos extensÃ£o .ts explÃ­cita para garantir que o bundler resolva os arquivos fonte
// registerRoutes: FunÃ§Ã£o que registra todas as rotas da API (definida em routes.ts)
import { registerRoutes } from "./routes/index.ts"; 
// setupVite: Configura Vite dev server | serveStatic: Serve arquivos build | log: FunÃ§Ã£o de logging
import { setupVite, serveStatic, log } from "./vite.ts";
// createServer: Cria servidor HTTP nativo do Node.js
import { createServer } from "http";
// WebSocket: Biblioteca para comunicaÃ§Ã£o bidirecional em tempo real
import { WebSocketServer, WebSocket } from "ws";
// verifyTokenFromQuery: Valida JWT token passado como query parameter no WebSocket
import { verifyTokenFromQuery } from "./middleware/auth.ts";
// storage: Acesso ao banco de dados para atualizar status online dos motoboys
import { storage } from "./storage.ts";
import { attachRequestId } from "./middleware/request-context.ts";
import { info as logInfo, error as logError } from "./logger.ts";
import { randomUUID } from "crypto";

// VARIÃVEL GLOBAL: InstÃ¢ncia do Express application
// Usada para registrar middlewares e rotas
const app = express();

// PROXY: Necessário quando atrás de nginx/reverse proxy para express-rate-limit funcionar corretamente
app.set('trust proxy', 1);

// VARIÃVEL GLOBAL: Servidor HTTP (pode ser undefined antes da inicializaÃ§Ã£o)
// ReturnType<typeof createServer> = tipo retornado pela funÃ§Ã£o createServer
let httpServer: ReturnType<typeof createServer> | undefined;
let wsServer: ReturnType<typeof createServer> | undefined;

declare module 'http' {
  interface IncomingMessage {
    rawBody: Buffer;
  }
}

// ========================================
// MIDDLEWARES DE SEGURANÃ‡A
// ========================================

// IdentificaÃ§Ã£o de requisiÃ§Ãµes para rastreabilidade
app.use(attachRequestId);

// SEGURANÃ‡A: Helmet - Headers HTTP seguros
// Previne ataques comuns (XSS, clickjacking, etc) configurando headers automaticamente
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
  crossOriginEmbedderPolicy: false, // NecessÃ¡rio para Vite HMR (Hot Module Replacement) funcionar em dev
}));

// SEGURANÃ‡A: CORS - Controle de origens permitidas
// Define quais domÃ­nios podem fazer requisiÃ§Ãµes ao servidor
// VARIÃVEL: allowedOrigins - Array de URLs permitidas (vem de .env ou usa defaults)
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
  limit: '10mb', // SEGURANÃ‡A: Limita tamanho do payload
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
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms (reqId=${req.requestId})`;
      logInfo("http_request", {
        requestId: req.requestId,
        method: req.method,
        path,
        status: res.statusCode,
        durationMs: duration,
      });
      log(logLine);
    }
  });

  next();
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ========================================
// WEBSOCKET - COMUNICAÃ‡ÃƒO EM TEMPO REAL
// ========================================

import { wsClients, broadcast, getOnlineUsers } from './ws/broadcast.js';

/**
 * FUNÃ‡ÃƒO EXPORTADA: getOnlineUsers
 * PROPÃ“SITO: Retorna array com IDs dos usuÃ¡rios conectados via WebSocket
 * USADO EM: routes.ts - endpoint /api/users/online
 */
// Delegates for WebSocket clients and broadcasting are imported from ws/broadcast.js

function startWebSocketServer(host: string, httpListener?: ReturnType<typeof createServer>) {
  // Evita inicializar duas vezes
  if (wsServer) {
    return;
  }

  // EstratÃ©gia: se jÃ¡ existe HTTP server (compartilhado com Vite HMR), usamos noServer:true
  // e roteamos manualmente via upgrade somente no path /ws, para nÃ£o conflitar com o socket de HMR.
  // Caso contrÃ¡rio, criamos um servidor dedicado ouvindo em WS_PORT.
  const useSharedServer = Boolean(httpListener);
  wsServer = httpListener ?? createServer();

  let wss: WebSocketServer;
  if (useSharedServer) {
    wss = new WebSocketServer({ noServer: true });
    wsServer.on('upgrade', (req, socket, head) => {
      try {
        const { pathname, searchParams } = new URL(req.url || '', `http://${host}`);
        if (pathname !== '/ws') {
          return; // Deixa outros listeners (ex: Vite HMR) tratarem upgrades diferentes
        }
        const token = searchParams.get('token');
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req, token);
        });
      } catch (err) {
        socket.destroy();
        logError('ws_upgrade_error', { message: (err as Error).message });
      }
    });
    log(`WebSocket server attached to existing HTTP server (shared port)`, 'ws');
  } else {
    const wsPort = parseInt(process.env.WS_PORT || '5001', 10);
    wss = new WebSocketServer({
      server: wsServer,
      path: '/ws',
    });
    wsServer.listen({ port: wsPort, host }, () => {
      log(`WebSocket server listening on dedicated port ${wsPort}`, 'ws');
    });
  }

  wss.on('error', (err) => {
    logError('ws_server_error', { message: (err as Error).message, stack: (err as Error).stack });
  });

  wss.on('connection', async (ws, req, tokenFromUpgrade?: string) => {
    const connectionId = randomUUID();
    const urlParams = new URLSearchParams(req.url?.split('?')[1] || '');
    const token = tokenFromUpgrade ?? urlParams.get('token');
    const user = verifyTokenFromQuery(token);

    if (!user) {
      logInfo('ws_reject', { connectionId, reason: 'invalid_token' });
      ws.terminate();
      return;
    }

    logInfo('ws_connect', { connectionId, userId: user.id, role: user.role });

    wsClients.set(user.id, ws);
    log(`WebSocket connected: ${user.id} (${user.role})`, 'ws');

    // Se for motoboy, marca como online
    if (user.role === 'motoboy') {
      try {
        await storage.updateMotoboyOnlineStatus(user.id, true);
        broadcast({ type: 'driver_online', payload: { id: user.id } });
        log(`Motoboy ${user.id} agora estÃ¡ ONLINE`, 'ws');
      } catch (error) {
        console.error(`Erro ao atualizar status online do motoboy ${user.id}:`, error);
      }
    }

    ws.on('error', (err) => {
      logError('ws_client_error', { connectionId, userId: user.id, message: (err as Error).message });
    });

    ws.on('close', async () => {
      wsClients.delete(user.id);
      log(`WebSocket disconnected: ${user.id}`, 'ws');
      logInfo('ws_disconnect', { connectionId, userId: user.id, role: user.role });

      // Se for motoboy, marca como offline
      if (user.role === 'motoboy') {
        try {
          await storage.updateMotoboyOnlineStatus(user.id, false);
          broadcast({ type: 'driver_offline', payload: { id: user.id } });
          log(`Motoboy ${user.id} agora estÃ¡ OFFLINE`, 'ws');
        } catch (error) {
          console.error(`Erro ao atualizar status offline do motoboy ${user.id}:`, error);
          logError('ws_disconnect_error', { connectionId, userId: user.id, error: (error as Error).message });
        }
      }
    });
  });
}

(async () => {
  const apiRouter = await registerRoutes();
  app.use(apiRouter);

  // SEGURANÃ‡A: Error handler que nÃ£o expÃµe detalhes em produÃ§Ã£o
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const status = (err as any).status || (err as any).statusCode || 500;

    logError("http_error", {
      requestId: (req as any).requestId,
      message: err.message,
      stack: err.stack,
      status,
      path: req.path,
      method: req.method,
    });

    if (process.env.NODE_ENV === "production") {
      res.status(status).json({ 
        error: status === 500 ? "Internal server error" : err.message,
        status,
        requestId: (req as any).requestId,
      });
    } else {
      res.status(status).json({ 
        error: err.message,
        status,
        stack: err.stack,
        requestId: (req as any).requestId,
      });
    }
  });

  const port = parseInt(process.env.PORT || '5000', 10);
  const host = "0.0.0.0";

  console.log(`ðŸ”§ Environment: ${process.env.NODE_ENV}`);
  console.log(`ðŸ”§ Port: ${port}, Host: ${host}`);

  if (process.env.NODE_ENV === "development") {
    console.log(`ðŸ”§ Creating HTTP server for development...`);
    httpServer = createServer(app);
    
    log(`Starting Vite setup...`);
    await setupVite(app, httpServer);
    log(`Vite setup complete!`);
    startWebSocketServer(host, httpServer);

    console.log(`ðŸ”§ Attempting to listen on ${host}:${port}...`);
    httpServer.listen({ port, host }, () => {
        console.log(`âœ… HTTP server actually listening!`);
        log(`serving in development on port ${port}`);
    });

    httpServer.on('error', (err) => {
      console.error(`ðŸ’¥ HTTP server error:`, err);
    });

  } else {
    serveStatic(app);
    httpServer = createServer(app);
    startWebSocketServer(host, httpServer);

    httpServer.listen({ port, host }, () => {
        log(`serving in production on port ${port}`);
    });
  }
})();

