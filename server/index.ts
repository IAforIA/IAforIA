import express, { type Request, Response, NextFunction } from "express";
// Importações com .js para compatibilidade ESM
import { registerRoutes } from "./routes.js"; 
import { setupVite, serveStatic, log } from "./vite.js";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws"; // Importar módulos WS
import { verifyTokenFromQuery } from "./middleware/auth.js"; // Importar função de autenticação WS

const app = express();
let httpServer: ReturnType<typeof createServer> | undefined;

declare module 'http' {
  interface IncomingMessage {
    rawBody: Buffer;
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

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

// Implementação Global de WebSockets e função de broadcast
const wsClients = new Map<string, WebSocket>();

// Exportado para ser usado em routes.ts
export function broadcast(message: any, excludeId?: string) {
  const data = JSON.stringify(message);
  wsClients.forEach((ws, id) => {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

(async () => {
  const apiRouter = await registerRoutes();
  app.use(apiRouter);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    const status = (err as any).status || (err as any).statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
  });

  const port = parseInt(process.env.PORT || '5000', 10);
  const host = "0.0.0.0";

  if (app.get("env") === "development") {
    httpServer = createServer(app);
    await setupVite(app, httpServer);

    httpServer.listen({ port, host }, () => {
        log(`serving in development on port ${port}`);
    });

  } else {
    serveStatic(app);
    httpServer = createServer(app);

    httpServer.listen({ port, host }, () => {
        log(`serving in production on port ${port}`);
    });
  }

  // --- CONFIGURAÇÃO DO WEBSOCKETS ---
  if (httpServer) {
    const wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', (ws, req) => {
      // Extrai e verifica o token JWT do query parameter da URL
      const urlParams = new URLSearchParams(req.url?.split('?')[1] || '');
      const token = urlParams.get('token');
      const user = verifyTokenFromQuery(token); // Usa a função de auth.ts

      if (!user) {
        // Encerra a conexão se não for autorizado
        ws.close(1008, 'Unauthorized'); 
        return;
      }

      // Usa o ID do usuário como identificador seguro para o cliente WS
      wsClients.set(user.id, ws);
      log(`WebSocket connected: ${user.id} (${user.role})`);

      ws.on('close', () => {
        wsClients.delete(user.id);
        log(`WebSocket disconnected: ${user.id}`);
      });
    });
  }
  // --- FIM DA CONFIGURAÇÃO DO WEBSOCKETS ---
})();
