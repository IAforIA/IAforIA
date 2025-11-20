/**
 * ARQUIVO: drizzle.config.ts
 * PROPÓSITO: Configurar CLI do drizzle-kit (migrations + introspecção)
 */

import type { Config } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const config: Config = {
  // Diretório onde drizzle-kit gera arquivos SQL
  out: "./migrations",
  // Fonte de verdade do schema compartilhado
  schema: "./shared/schema.ts",
  // Usa mesma connection string nas migrations e no app
  connectionString: process.env.DATABASE_URL,
};

export default config;
