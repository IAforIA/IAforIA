/**
 * Script para importar os 28 clientes e 10 motoboys reais da Guriri Express
 * 
 * Execute: npx tsx server/scripts/import-empresa-completa.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users, motoboys, clients } from '@shared/schema';
import bcrypt from 'bcryptjs';
import * as schema from '@shared/schema';
import { generateSecurePassword, CredentialRecorder } from './utils/credential-helper';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não configurada no .env');
}

const db = drizzle(neon(process.env.DATABASE_URL), { schema });

// =====================================================
// ADMIN DA CENTRAL
// =====================================================

const ADMIN_CENTRAL = {
  id: 'admin-001',
  nome: 'Central Guriri Express',
  telefone: '27999999999',
  email: 'admin@guriri.com',
};

// =====================================================
// 10 MOTOBOYS REAIS
// =====================================================

const MOTOBOYS = [
  { id: 'moto-001', nome: 'JOÃO', telefone: '27999694181', email: 'joao@guriri.com' },
  { id: 'moto-002', nome: 'YURI', telefone: '27998869204', email: 'yuri@guriri.com' },
  { id: 'moto-003', nome: 'DOUGLAS', telefone: '27996132205', email: 'douglas@guriri.com' },
  { id: 'moto-004', nome: 'BRUNO', telefone: '27992264338', email: 'bruno@guriri.com' },
  { id: 'moto-005', nome: 'GUILHERME', telefone: '27996304092', email: 'guilherme@guriri.com' },
  { id: 'moto-006', nome: 'VICTOR HUGO', telefone: '21970257886', email: 'victor@guriri.com' },
  { id: 'moto-007', nome: 'OTAVIO', telefone: '27997112700', email: 'otavio@guriri.com' },
  { id: 'moto-008', nome: 'DAVI', telefone: '27997638737', email: 'davi@guriri.com' },
  { id: 'moto-009', nome: 'FELIPE', telefone: '27992690704', email: 'felipe@guriri.com' },
  { id: 'moto-010', nome: 'CRISTIANO', telefone: '27996048857', email: 'cristiano@guriri.com' },
];

// =====================================================
// 28 CLIENTES REAIS
// =====================================================

const CLIENTES = [
  { id: 'client-001', nome: 'SAMPAIO', telefone: '27999883067', mensalidade: '240.00', horario: '18:00 AS 23:00 SEG A QUINTA | SEXTA A DOMINGO 18:00 AS 23:30' },
  { id: 'client-002', nome: 'PARAÇAI', telefone: '27996878582', mensalidade: '100.00', horario: '15:00 AS 23:00 TERÇA A DOMINGO' },
  { id: 'client-003', nome: 'DROGARIA LUA E SOL', telefone: '27999135128', mensalidade: '120.00', horario: '09:00 AS 22:00 SEG A DOMINGO' },
  { id: 'client-004', nome: 'GURIFARMA', telefone: '27999087951', mensalidade: '80.00', horario: '09:00 AS 19:00 SEG A SABADO' },
  { id: 'client-005', nome: 'OLIVA MASSAS', telefone: '27998446836', mensalidade: '80.00', horario: '19:00 AS 22:00 FOLGA SABADO E SEGUNDA' },
  { id: 'client-006', nome: 'PETISCOS', telefone: '27998631696', mensalidade: '80.00', horario: '18:00 AS 22:30 SEG A DOMINGO FOLGA TERÇA' },
  { id: 'client-007', nome: 'SABORES FIT', telefone: '27999950432', mensalidade: '160.00', horario: '11:00 AS 13:30 SEG A SABADO' },
  { id: 'client-008', nome: 'SO SALADAS', telefone: '32998627638', mensalidade: '0.00', horario: '11:00 AS 15:00 SEG A SEXTA' },
  { id: 'client-009', nome: 'POP FARMA', telefone: '27995164877', mensalidade: '100.00', horario: '09:00 AS 21:00 SEG A DOMINGO' },
  { id: 'client-010', nome: 'OISHI', telefone: '27999198756', mensalidade: '80.00', horario: '18:00 AS 23:00 TERÇA A DOMINGO FOLGA SEGUNDA E SABADO' },
  { id: 'client-011', nome: 'TAKEDA', telefone: '27997055881', mensalidade: '240.00', horario: '18:00 AS 22:30 SEG A DOMINGO FOLGA TERÇA' },
  { id: 'client-012', nome: 'POINT MILK', telefone: '27988792973', mensalidade: '60.00', horario: '13:00 AS 21:00 SEG A DOMINGO FOLGA TERÇA' },
  { id: 'client-013', nome: 'MONICA', telefone: '27998375170', mensalidade: '80.00', horario: '18:00 AS 23:00 SEG/TERÇA FOLGA QUARTA | QUINTA 18:00 AS 23:30 | SEXTA/SABADO/DOMINGO 13:00 AS 23:30' },
  { id: 'client-014', nome: 'CAPIXABA', telefone: '27998800125', mensalidade: '0.00', horario: '09:00 AS 22:00 SEG A DOMINGO' },
  { id: 'client-015', nome: 'INDIANA', telefone: '27999896982', mensalidade: '60.00', horario: '09:00 AS 22:00 SEG A DOMINGO' },
  { id: 'client-016', nome: 'LITORAL', telefone: '27997335333', mensalidade: '80.00', horario: '18:00 AS 23:00 SEG A DOMINGO' },
  { id: 'client-017', nome: 'PLANET ROCK', telefone: '27997214545', mensalidade: '100.00', horario: '18:00 AS 22:00 TERÇA A SABADO' },
  { id: 'client-018', nome: 'BAU DO TESOURO', telefone: '27997551017', mensalidade: '60.00', horario: 'QUARTA A SEXTA 18:00 AS 22:30 | SABADO/DOMINGO 13:00 AS 22:00' },
  { id: 'client-019', nome: 'DROGARIA GURIRI', telefone: '27999775570', mensalidade: '100.00', horario: 'SEG A SABADO 09:00 AS 21:00 | DOMINGO 09:00 AS 13:00' },
  { id: 'client-020', nome: 'SÃO BENEDITO', telefone: '27999896696', mensalidade: '80.00', horario: 'SEG A SEXTA 18:00 AS 23:00 | SABADO/DOMINGO 11:00 AS 23:00' },
  { id: 'client-021', nome: 'AVELAR SALGADOS', telefone: '27998316804', mensalidade: '80.00', horario: '10:00 AS 19:00 SEG A DOMINGO' },
  { id: 'client-022', nome: 'COMPANHIA DA PIZZA', telefone: '27998225953', mensalidade: '240.00', horario: 'TERÇA A QUINTA 18:00 AS 23:00 | SEXTA A DOMINGO 18:00 AS 23:30' },
  { id: 'client-023', nome: 'CASA JAMILA', telefone: '27997171532', mensalidade: '80.00', horario: '18:00 AS 22:30 QUARTA A DOMINGO' },
  { id: 'client-024', nome: 'MAKAI', telefone: '27999937071', mensalidade: '80.00', horario: '18:00 AS 22:00 QUARTA A DOMINGO' },
  { id: 'client-025', nome: 'SAARA', telefone: '27998614294', mensalidade: '80.00', horario: '18:00 AS 23:00 QUINTA A DOMINGO' },
  { id: 'client-026', nome: 'MIZA', telefone: '27996898731', mensalidade: '100.00', horario: 'SEG A SEXTA 11:00 AS 14:00 FOLGA TERÇA | SABADO/DOMINGO 11:00 AS 15:00' },
  { id: 'client-027', nome: 'BASE 10 PLUS', telefone: '27998747864', mensalidade: '50.00', horario: '09:00 AS 19:00 SEG A DOMINGO' },
  { id: 'client-028', nome: 'DROGARIA POVO', telefone: '27998288218', mensalidade: '0.00', horario: '09:00 AS 20:00 SEG A DOMINGO' },
];

// =====================================================
// FUNÇÃO DE IMPORTAÇÃO
// =====================================================

async function importarTudo() {
  console.log('🚀 INICIANDO IMPORTAÇÃO COMPLETA DA GURIRI EXPRESS\n');
  console.log('=' .repeat(70));

  let stats = {
    admin: 0,
    motoboys: 0,
    clientes: 0,
    erros: 0,
  };

  const credentialRecorder = new CredentialRecorder('import-empresa-completa');

  // 1. CRIAR ADMIN
  try {
    console.log('\n👨‍💼 Criando usuário ADMIN da central...');
    const adminPassword = generateSecurePassword(ADMIN_CENTRAL.id);
    const senhaHashAdmin = await bcrypt.hash(adminPassword, 10);
    
    await db.insert(users).values({
      id: ADMIN_CENTRAL.id,
      name: ADMIN_CENTRAL.nome,
      role: 'central',
      email: ADMIN_CENTRAL.email,
      phone: ADMIN_CENTRAL.telefone,
      password: senhaHashAdmin,
      status: 'active',
    });
    
    console.log('✅ Admin criado com sucesso!');
    stats.admin = 1;

    credentialRecorder.add({
      id: ADMIN_CENTRAL.id,
      email: ADMIN_CENTRAL.email,
      role: 'central',
      password: adminPassword,
    });
  } catch (error: any) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      console.log('⚠️  Admin já existe');
      stats.admin = 1;
    } else {
      console.error('❌ Erro ao criar admin:', error.message);
      stats.erros++;
    }
  }

  // 2. CRIAR MOTOBOYS
  console.log('\n🏍️  Criando 10 MOTOBOYS...');
  for (const moto of MOTOBOYS) {
    try {
      const tempPassword = generateSecurePassword(moto.id);
      const senhaHash = await bcrypt.hash(tempPassword, 10);

      await db.insert(users).values({
        id: moto.id,
        name: moto.nome,
        role: 'motoboy',
        email: moto.email,
        phone: moto.telefone,
        password: senhaHash,
        status: 'active',
      });

      await db.insert(motoboys).values({
        id: moto.id,
        name: moto.nome,
        phone: moto.telefone,
        placa: '',
        cpf: '',
        taxaPadrao: '7.00',
        status: 'ativo',
        online: false,
      });

      console.log(`   ✅ ${moto.nome}`);
      stats.motoboys++;

      credentialRecorder.add({
        id: moto.id,
        email: moto.email,
        role: 'motoboy',
        password: tempPassword,
      });
    } catch (error: any) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        console.log(`   ⚠️  ${moto.nome} já existe`);
        stats.motoboys++;
      } else {
        console.error(`   ❌ ${moto.nome}: ${error.message}`);
        stats.erros++;
      }
    }
  }

  // 3. CRIAR CLIENTES
  console.log('\n👥 Criando 28 CLIENTES...');
  for (const cliente of CLIENTES) {
    try {
      const tempPassword = generateSecurePassword(cliente.id);
      const senhaHash = await bcrypt.hash(tempPassword, 10);
      const email = `${cliente.nome.toLowerCase().replace(/\s+/g, '')}@cliente.com`;

      await db.insert(users).values({
        id: cliente.id,
        name: cliente.nome,
        role: 'client',
        email: email,
        phone: cliente.telefone,
        password: senhaHash,
        status: 'active',
      });

      await db.insert(clients).values({
        id: cliente.id,
        name: cliente.nome,
        phone: cliente.telefone,
        email: email,
        company: cliente.nome,
        mensalidade: cliente.mensalidade,
        horarioFuncionamento: cliente.horario,
      });

      console.log(`   ✅ ${cliente.nome} (R$ ${cliente.mensalidade}/mês)`);
      stats.clientes++;

      credentialRecorder.add({
        id: cliente.id,
        email,
        role: 'client',
        password: tempPassword,
      });
    } catch (error: any) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        console.log(`   ⚠️  ${cliente.nome} já existe`);
        stats.clientes++;
      } else {
        console.error(`   ❌ ${cliente.nome}: ${error.message}`);
        stats.erros++;
      }
    }
  }

  // RESUMO FINAL
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMO DA IMPORTAÇÃO');
  console.log('='.repeat(70));
  console.log(`✅ Admin Central: ${stats.admin}`);
  console.log(`✅ Motoboys: ${stats.motoboys}/10`);
  console.log(`✅ Clientes: ${stats.clientes}/28`);
  console.log(`❌ Erros: ${stats.erros}`);
  console.log('='.repeat(70));

  const credentialFile = credentialRecorder.finalize();
  console.log('\n📁 Senhas temporárias exportadas para:', credentialFile);
  console.log('   Compartilhe o arquivo somente com quem precisa e delete após o uso.');

  // CREDENCIAIS
  console.log('\n📝 CREDENCIAIS DE ACESSO:');
  console.log('─'.repeat(70));
  
  console.log('\n👨‍💼 CENTRAL (Admin):');
  console.log(`   URL: http://localhost:5000/central`);
  console.log(`   Email: ${ADMIN_CENTRAL.email}`);
  console.log('   Senha temporária: consulte o arquivo CSV gerado.\n');
  
  console.log('🏍️  MOTOBOYS (todos):');
  console.log(`   URL: http://localhost:5000/driver`);
  console.log('   Senhas individuais disponíveis no CSV gerado.');
  console.log('   Emails:');
  MOTOBOYS.forEach(m => {
    console.log(`      ${m.nome.padEnd(15)} → ${m.email.padEnd(25)} (${m.telefone})`);
  });
  
  console.log('\n👥 CLIENTES (todos):');
  console.log(`   URL: http://localhost:5000/client`);
  console.log('   Senhas individuais disponíveis no CSV gerado.');
  console.log('   Top 5 por mensalidade:');
  
  const top5 = [...CLIENTES]
    .sort((a, b) => parseFloat(b.mensalidade) - parseFloat(a.mensalidade))
    .slice(0, 5);
  
  top5.forEach(c => {
    const email = `${c.nome.toLowerCase().replace(/\s+/g, '')}@cliente.com`;
    console.log(`      ${c.nome.padEnd(20)} → R$ ${c.mensalidade.padStart(6)}/mês → ${email}`);
  });

  console.log('\n💡 PRÓXIMOS PASSOS:');
  console.log('─'.repeat(70));
  console.log('1. Inicie o servidor: npm run dev');
  console.log('2. Acesse: http://localhost:5000');
  console.log('3. Faça login com as credenciais acima');
  console.log('4. Distribua as credenciais para sua equipe via WhatsApp');
  console.log('5. Oriente todos a trocarem a senha no primeiro acesso\n');

  console.log('🎉 IMPORTAÇÃO CONCLUÍDA COM SUCESSO!\n');

  process.exit(0);
}

// Executar
importarTudo().catch((error) => {
  console.error('\n❌ ERRO FATAL:', error.message);
  console.error('\nVerifique se:');
  console.error('1. DATABASE_URL está configurada no .env');
  console.error('2. Executou: npm run db:push');
  console.error('3. Banco de dados está acessível\n');
  process.exit(1);
});
