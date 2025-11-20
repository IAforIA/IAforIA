/**
 * ARQUIVO: vite.config.ts
 * PROPÓSITO: Configurar Vite para servir o front em /client com aliases compartilhados
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // @vitejs/plugin-react habilita Fast Refresh e JSX transform
  plugins: [react()],
  resolve: {
    // Força Vite a priorizar .ts/.tsx quando um arquivo .js antigo existir
    extensions: [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mjs",
      ".mts",
      ".json",
    ],
    alias: {
      // "@" aponta para client/src e é usado em todo o front
      "@": path.resolve(__dirname, "client", "src"),
      // "@shared" permite importar schema/drizzle tanto no front quanto no back
      "@shared": path.resolve(__dirname, "shared"),
      // Assets exportados pelo time de BI ficam versionados em attached_assets
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  // root define onde ficam os entrypoints do front
  root: path.resolve(__dirname, "client"),
  build: {
    // Build do front cai em dist/public, servido pelo Express
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});