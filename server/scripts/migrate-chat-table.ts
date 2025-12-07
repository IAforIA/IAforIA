/**
 * SCRIPT: migrate-chat-table.ts
 * PROPÓSITO: Migrar tabela chat_messages antiga para novo formato simplificado
 * 
 * MUDANÇAS:
 * - Remove: fromName, fromRole, toId, toRole, category, threadId, isFromCentral
 * - Adiciona: senderId, receiverId, audioUrl, imageUrl
 * - Mantém: id, orderId, message, createdAt
 * 
 * EXECUTAR: npx tsx server/scripts/migrate-chat-table.ts
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

async function migrateChatTable() {
  console.log("🔧 Iniciando migração da tabela chat_messages...\n");

  try {
    const centralUserId = process.env.CENTRAL_USER_ID || 'central';

    // PASSO 1: Criar tabela temporária com novo schema
    console.log("1️⃣  Criando tabela temporária...");
    await db.execute(sql`
      CREATE TABLE chat_messages_new (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id VARCHAR NOT NULL,
        receiver_id VARCHAR NOT NULL,
        order_id VARCHAR,
        message TEXT,
        audio_url TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    console.log("   ✅ Tabela temporária criada\n");

    // PASSO 2: Migrar dados existentes
    console.log("2️⃣  Migrando dados existentes...");
    await db.execute(sql`
      INSERT INTO chat_messages_new (id, sender_id, receiver_id, order_id, message, created_at)
      SELECT 
        id,
        from_id AS sender_id,
        COALESCE(to_id, ${centralUserId}) AS receiver_id,
        order_id,
        message,
        created_at
      FROM chat_messages
    `);
    console.log("   ✅ Dados migrados\n");

    // PASSO 3: Dropar tabela antiga
    console.log("3️⃣  Removendo tabela antiga...");
    await db.execute(sql`DROP TABLE chat_messages`);
    console.log("   ✅ Tabela antiga removida\n");

    // PASSO 4: Renomear tabela nova
    console.log("4️⃣  Renomeando tabela nova...");
    await db.execute(sql`ALTER TABLE chat_messages_new RENAME TO chat_messages`);
    console.log("   ✅ Tabela renomeada\n");

    console.log("✅ Migração concluída com sucesso!");
    console.log("\n⚠️  IMPORTANTE: Verifique se o ID da Central está correto nos dados migrados!");
    
  } catch (error) {
    console.error("❌ Erro durante migração:", error);
    console.log("\n🔄 Tentando reverter...");
    
    // Tentar reverter em caso de erro
    try {
      await db.execute(sql`DROP TABLE IF EXISTS chat_messages_new`);
      console.log("✅ Reversão concluída");
    } catch (rollbackError) {
      console.error("❌ Erro ao reverter:", rollbackError);
    }
    
    process.exit(1);
  }

  process.exit(0);
}

migrateChatTable();
