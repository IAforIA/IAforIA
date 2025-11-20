/**
 * SCRIPT: migrate-database.ts
 * PROPÓSITO: Adicionar colunas faltantes ao banco de dados existente
 * USO: npx tsx server/scripts/migrate-database.ts
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Carregar variáveis de ambiente
config();

const DATABASE_URL = process.env.DATABASE_URL!;

async function migrate() {
  console.log('🔄 Iniciando migração do banco de dados...\n');
  
  const sql = neon(DATABASE_URL);

  try {
    // ========================================
    // MIGRAÇÃO: TABELA CLIENTS
    // ========================================
    console.log('📦 Migrando tabela CLIENTS...');
    
    // Adicionar TODAS as colunas faltantes na tabela clients
    await sql`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS company TEXT,
      ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'PF',
      ADD COLUMN IF NOT EXISTS document_number TEXT DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS ie TEXT,
      ADD COLUMN IF NOT EXISTS cep TEXT DEFAULT '00000-000',
      ADD COLUMN IF NOT EXISTS rua TEXT DEFAULT 'ENDERECO-PENDENTE',
      ADD COLUMN IF NOT EXISTS numero TEXT DEFAULT '0',
      ADD COLUMN IF NOT EXISTS bairro TEXT DEFAULT 'BAIRRO-PENDENTE',
      ADD COLUMN IF NOT EXISTS complemento TEXT,
      ADD COLUMN IF NOT EXISTS referencia TEXT,
      ADD COLUMN IF NOT EXISTS geo_lat DECIMAL(10, 7),
      ADD COLUMN IF NOT EXISTS geo_lng DECIMAL(10, 7),
      ADD COLUMN IF NOT EXISTS mensalidade DECIMAL(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS horario_funcionamento TEXT
    `;
    
    // Atualizar valores padrão para registros existentes
    await sql`
      UPDATE clients 
      SET 
        cep = COALESCE(cep, '00000-000'),
        rua = COALESCE(rua, 'ENDERECO-PENDENTE'),
        numero = COALESCE(numero, '0'),
        bairro = COALESCE(bairro, 'BAIRRO-PENDENTE'),
        document_type = COALESCE(document_type, 'PF'),
        document_number = COALESCE(document_number, 'PENDING')
    `;
    
    // Garantir que colunas obrigatórias não aceitem NULL
    await sql`
      ALTER TABLE clients 
      ALTER COLUMN cep SET NOT NULL,
      ALTER COLUMN rua SET NOT NULL,
      ALTER COLUMN numero SET NOT NULL,
      ALTER COLUMN bairro SET NOT NULL,
      ALTER COLUMN document_type SET NOT NULL,
      ALTER COLUMN document_number SET NOT NULL
    `;
    
    console.log('✅ Tabela CLIENTS migrada com sucesso!\n');

    // ========================================
    // MIGRAÇÃO: TABELA ORDERS
    // ========================================
    console.log('📦 Migrando tabela ORDERS...');
    
    await sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS cliente_ref_id TEXT,
      ADD COLUMN IF NOT EXISTS coleta_override BOOLEAN DEFAULT false
    `;
    
    // Garantir que coleta_override tem valor padrão para registros existentes
    await sql`
      UPDATE orders 
      SET coleta_override = false 
      WHERE coleta_override IS NULL
    `;
    
    await sql`
      ALTER TABLE orders 
      ALTER COLUMN coleta_override SET NOT NULL
    `;
    
    console.log('✅ Tabela ORDERS migrada com sucesso!\n');

    // ========================================
    // MIGRAÇÃO: TABELA MOTOBOYS
    // ========================================
    console.log('📦 Migrando tabela MOTOBOYS...');
    
    await sql`
      ALTER TABLE motoboys 
      ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `;
    
    // Garantir que todos os motoboys existentes estão disponíveis
    await sql`
      UPDATE motoboys 
      SET available = true, updated_at = NOW() 
      WHERE available IS NULL
    `;
    
    console.log('✅ Tabela MOTOBOYS migrada com sucesso!\n');

    console.log('✨ Migração concluída com sucesso!');
    console.log('\n📊 Resumo das alterações:');
    console.log('  • CLIENTS: +8 colunas (company, document_type, document_number, ie, geo_lat, geo_lng, mensalidade, horario_funcionamento)');
    console.log('  • ORDERS: +2 colunas (cliente_ref_id, coleta_override)');
    console.log('  • MOTOBOYS: +2 colunas (available, updated_at)');
    
  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    throw error;
  }
}

migrate().catch(console.error);
