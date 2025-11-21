import pg from 'pg';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://guriri_user:guriri_password@localhost:5432/guriri_express';

async function runMigration() {
  const client = new pg.Client(DATABASE_URL);
  
  try {
    await client.connect();
    console.log('🔌 Conectado ao banco de dados');
    
    const sqlPath = path.join(process.cwd(), 'migrations', 'add-chat-categories.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    await client.query(sql);
    console.log('✅ Migração executada com sucesso!');
    console.log('📋 Campos adicionados:');
    console.log('   - to_role (papel do destinatário)');
    console.log('   - category (status_entrega | suporte | problema)');
    console.log('   - thread_id (agrupa mensagens da mesma conversa)');
    console.log('   - is_from_central (identifica respostas da IA/Central)');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
