// CRÍTICO: Carregar variáveis de ambiente PRIMEIRO
import 'dotenv/config';

// Script de teste de conexão e validação do banco de dados
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';

async function testDatabase() {
  console.log('🔍 INICIANDO AUDITORIA DO BANCO DE DADOS\n');
  
  // 1. Verificar variável de ambiente
  console.log('1️⃣ Verificando DATABASE_URL...');
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não encontrada!');
    process.exit(1);
  }
  console.log('✅ DATABASE_URL configurada\n');
  
  // 2. Testar conexão
  console.log('2️⃣ Testando conexão com Neon PostgreSQL...');
  try {
    const db = drizzle(neon(process.env.DATABASE_URL), { schema });
    console.log('✅ Conexão estabelecida\n');
    
    // 3. Verificar tabelas
    console.log('3️⃣ Verificando tabelas existentes...');
    
    // Testar tabela users
    const users = await db.select().from(schema.users).limit(5);
    console.log(`✅ Tabela 'users': ${users.length} registro(s) encontrado(s)`);
    
    // Testar tabela motoboys
    const motoboys = await db.select().from(schema.motoboys).limit(5);
    console.log(`✅ Tabela 'motoboys': ${motoboys.length} registro(s) encontrado(s)`);
    
    // Testar tabela clients
    const clients = await db.select().from(schema.clients).limit(5);
    console.log(`✅ Tabela 'clients': ${clients.length} registro(s) encontrado(s)`);
    
    // Testar tabela orders
    const orders = await db.select().from(schema.orders).limit(5);
    console.log(`✅ Tabela 'orders': ${orders.length} registro(s) encontrado(s)`);
    
    // Testar tabela chatMessages
    const chatMessages = await db.select().from(schema.chatMessages).limit(5);
    console.log(`✅ Tabela 'chat_messages': ${chatMessages.length} registro(s) encontrado(s)`);
    
    // Testar tabela motoboyLocations
    const locations = await db.select().from(schema.motoboyLocations).limit(5);
    console.log(`✅ Tabela 'motoboy_locations': ${locations.length} registro(s) encontrado(s)`);
    
    console.log('\n📊 RESUMO DA AUDITORIA:');
    console.log('═══════════════════════════════════════');
    console.log(`Total de usuários: ${users.length}`);
    console.log(`Total de motoboys: ${motoboys.length}`);
    console.log(`Total de clientes: ${clients.length}`);
    console.log(`Total de pedidos: ${orders.length}`);
    console.log(`Total de mensagens: ${chatMessages.length}`);
    console.log(`Total de localizações: ${locations.length}`);
    
    if (users.length > 0) {
      console.log('\n👤 AMOSTRA DE USUÁRIOS:');
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.role}) - ${user.email || 'sem email'}`);
      });
    }
    
    if (motoboys.length > 0) {
      console.log('\n🏍️ AMOSTRA DE MOTOBOYS:');
      motoboys.forEach(motoboy => {
        console.log(`  - ${motoboy.name} - ${motoboy.phone || 'sem telefone'} - ${motoboy.online ? '🟢 Online' : '🔴 Offline'}`);
      });
    }
    
    console.log('\n✅ BANCO DE DADOS FUNCIONANDO CORRETAMENTE!');
    
  } catch (error: any) {
    console.error('\n❌ ERRO NA CONEXÃO OU CONSULTA:');
    console.error(error.message);
    console.error('\nDetalhes completos:');
    console.error(error);
    process.exit(1);
  }
}

testDatabase();
