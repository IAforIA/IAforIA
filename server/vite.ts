import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";

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
    hmr: { server }, // Reabilita HMR
    allowedHosts: true as const,
  };

  // __dirname alternativo para ES Modules no Windows
  const __filename = new URL(import.meta.url).pathname;
  const __dirname = path.dirname(__filename);
  // Remover barra inicial extra no Windows (converte /C:/Users para C:/Users)
  const normalizedDirname = __dirname.startsWith('/') && __dirname.charAt(2) === ':' 
    ? __dirname.substring(1) 
    : __dirname;
  
  const vite = await createViteServer({
    configFile: path.resolve(normalizedDirname, '..', 'vite.config.ts'),
    customLogger: {
      ...viteLogger,
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplatePath = path.resolve(
        normalizedDirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplatePath, "utf-8");

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const __filename = new URL(import.meta.url).pathname;
  const __dirname = path.dirname(__filename);
  const normalizedDirname = __dirname.startsWith('/') && __dirname.charAt(2) === ':' 
    ? __dirname.substring(1) 
    : __dirname;
  const distPath = path.resolve(normalizedDirname, "..", "dist", "public");

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