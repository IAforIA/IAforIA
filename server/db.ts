/**
 * ARQUIVO: server/db.ts
 * PROPÓSITO: Configuração e exportação da instância do Drizzle ORM
 * 
 * RESPONSABILIDADES:
 * - Conectar ao banco de dados PostgreSQL via Neon (serverless)
 * - Exportar instância db para uso em toda a aplicação
 * - Validar presença da DATABASE_URL antes de iniciar
 * 
 * CONEXÃO: Importado por storage.ts, routes.ts e scripts de migração
 */

// drizzle: Função factory que cria instância do Drizzle ORM
import { drizzle } from 'drizzle-orm/neon-http';
// neon: Cliente HTTP serverless para PostgreSQL (Neon Database)
import { neon } from '@neondatabase/serverless';
// schema: Todas as definições de tabelas (users, orders, motoboys, etc)
import * as schema from '@shared/schema';

// ========================================
// VALIDAÇÃO DE VARIÁVEL DE AMBIENTE
// ========================================

// CRÍTICO: Garante que DATABASE_URL está definida no .env
// COMPORTAMENTO: Lança erro e impede inicialização se ausente
// SEGURANÇA: Evita executar aplicação sem conexão com banco
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required.");
}

// ========================================
// EXPORTAÇÃO DA INSTÂNCIA DO BANCO
// ========================================

/**
 * CONSTANTE EXPORTADA: db
 * PROPÓSITO: Instância configurada do Drizzle ORM
 * TIPO: DrizzleD1Database<typeof schema>
 * 
 * CONFIGURAÇÃO:
 * - Cliente: neon() - HTTP client para Neon Database
 * - Schema: Todos os schemas importados de @shared/schema
 * 
 * USO TÍPICO:
 *   await db.select().from(orders).where(eq(orders.id, orderId))
 *   await db.insert(users).values({ id, name, email, ... })
 *   await db.update(motoboys).set({ available: true }).where(eq(motoboys.id, id))
 * 
 * NOTA: Type-safe graças ao schema TypeScript gerado pelo Drizzle
 */
export const db = drizzle(neon(process.env.DATABASE_URL), { schema });
