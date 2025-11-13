import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
// import viteConfig from "../vite.config.js"; // Não precisamos mais importar o config inteiro, o setupVite cria o seu próprio

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true as const,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    // Usamos o objeto de configuração que você forneceu anteriormente, mas como objeto literal ou importando o arquivo corrigido
    // Para simplificar, assumimos que o arquivo vite.config.js existe e está corrigido.
    configFile: path.resolve(import.meta.dirname, '..', 'vite.config.js'), 
    customLogger: {
      ...viteLogger,
      // REMOVIDO: process.exit(1) agressivo
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplatePath = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // Apenas lê o template. O Vite cuida do cache busting e HMR.
      let template = await fs.promises.readFile(clientTemplatePath, "utf-8");

      // REMOVIDAS as linhas com nanoid() e template.replace()

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // CORRIGIDO o caminho para apontar para o diretório de build real (dist/public)
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public"); 

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
