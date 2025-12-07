/**
 * Script para executar migration de campos de reatribuição
 * Adiciona: offeredToMotoboyId, offeredToMotoboyName, offeredAt, reassignmentReason
 * Atualiza constraint de status para incluir 'reassignment_pending'
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_37JTAgKEBSvN@ep-green-leaf-ac82i0oo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";

async function runMigration() {
  const sql = neon(DATABASE_URL);
  
  try {
    console.log("🔧 Executando migration: add-reassignment-fields...");

    // Adicionar colunas
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS offered_to_motoboy_id VARCHAR`;
    console.log("✅ Coluna offered_to_motoboy_id criada");

    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS offered_to_motoboy_name TEXT`;
    console.log("✅ Coluna offered_to_motoboy_name criada");

    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS offered_at TIMESTAMP`;
    console.log("✅ Coluna offered_at criada");

    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS reassignment_reason TEXT`;
    console.log("✅ Coluna reassignment_reason criada");

    // Atualizar constraint de status (NOT VALID para não verificar dados existentes)
    await sql`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check`;
    console.log("✅ Constraint antiga removida");

    await sql`
      ALTER TABLE orders ADD CONSTRAINT orders_status_check 
      CHECK (status IN ('pending', 'in_progress', 'delivered', 'cancelled', 'reassignment_pending'))
      NOT VALID
    `;
    console.log("✅ Constraint atualizada com status 'reassignment_pending' (NOT VALID - não valida dados existentes)");

    console.log("\n🎉 Migration executada com sucesso!");
    console.log("⚠️  NOTA: A constraint foi criada como NOT VALID para permitir dados existentes.");
    console.log("   Novos pedidos precisarão ter status válido.");
    
  } catch (error) {
    console.error("💥 Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
