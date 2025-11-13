import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js"; // Adicionado .js para compatibilidade ES Modules
import { setupVite, serveStatic, log } from "./vite.js"; // Adicionado .js para compatibilidade ES Modules

const app = express();

// A tipagem do rawBody é necessária para o middleware de verificação do express.json
declare module 'http' {
  interface IncomingMessage {
    rawBody: Buffer; // Alterado para Buffer, que é o tipo correto de dado binário
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Middleware de logging aprimorado (logLine.length > 80 foi removido, use o log do vite ou ferramentas externas para isso)
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

(async () => {
  // Nota: registerRoutes foi alterado para apenas retornar o router no arquivo routes.ts corrigido
  app.use(await registerRoutes());

  // Middleware de tratamento de erros global
  // Não deve lançar o erro novamente (throw err), apenas logar e enviar a resposta
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err); // Loga o erro internamente para depuração
    const status = (err as any).status || (err as any).statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    // setupVite agora espera o objeto server http para configurar o HMR
    const server = app.listen(); // Inicia o servidor HTTP
    await setupVite(app, server); // Passa o servidor HTTP para o Vite
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);

  // No modo de desenvolvimento, o servidor já está ouvindo e o Vite gerencia a porta.
  // Em produção, precisamos garantir que o servidor ouça a porta correta.
  if (app.get("env") === "production") {
    app.listen(port, "0.0.0.0", () => {
      log(`serving in production on port ${port}`);
    });
  } else {
    // Em desenvolvimento, o Vite cuida da mensagem de log da porta
    log(`serving in development (Vite handles the port)`);
  }
})();
