/**
 * Script para importar os 10 motoboys reais da Guriri Express
 * 
 * Execute: npx tsx server/scripts/import-motoboys-reais.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users, motoboys, motoboySchedules } from '@shared/schema';
import bcrypt from 'bcryptjs';
import * as schema from '@shared/schema';
import { generateSecurePassword, CredentialRecorder } from './utils/credential-helper';
import { eq, and } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não configurada no .env');
}

const db = drizzle(neon(process.env.DATABASE_URL), { schema });

// =====================================================
// SEUS 10 MOTOBOYS REAIS
// =====================================================

const MOTOBOYS_GURIRI = [
  {
    id: 'moto-joao',
    nome: 'JOÃO',
    telefone: '27999694181',
    email: 'joao@guriri.com',
    placa: '', // Adicionar depois
    cpf: '',   // Adicionar depois
  },
  {
    id: 'moto-yuri',
    nome: 'YURI',
    telefone: '27998869204',
    email: 'yuri@guriri.com',
    placa: '',
    cpf: '',
  },
  {
    id: 'moto-douglas',
    nome: 'DOUGLAS',
    telefone: '27996132205',
    email: 'douglas@guriri.com',
    placa: '',
    cpf: '',
  },
  {
    id: 'moto-bruno',
    nome: 'BRUNO',
    telefone: '27992264338',
    email: 'bruno@guriri.com',
    placa: '',
    cpf: '',
  },
  {
    id: 'moto-guilherme',
    nome: 'GUILHERME',
    telefone: '27996304092',
    email: 'guilherme@guriri.com',
    placa: '',
    cpf: '',
  },
  {
    id: 'moto-victor',
    nome: 'VICTOR HUGO',
    telefone: '21970257886',
    email: 'victor@guriri.com',
    placa: '',
    cpf: '',
  },
  {
    id: 'moto-otavio',
    nome: 'OTAVIO',
    telefone: '27997112700',
    email: 'otavio@guriri.com',
    placa: '',
    cpf: '',
  },
  {
    id: 'moto-davi',
    nome: 'DAVI',
    telefone: '27997638737',
    email: 'davi@guriri.com',
    placa: '',
    cpf: '',
  },
  {
    id: 'moto-felipe',
    nome: 'FELIPE',
    telefone: '27992690704',
    email: 'felipe@guriri.com',
    placa: '',
    cpf: '',
  },
  {
    id: 'moto-cristiano',
    nome: 'CRISTIANO',
    telefone: '27996048857',
    email: 'cristiano@guriri.com',
    placa: '',
    cpf: '',
  },
];

// =====================================================
// ADMIN DA CENTRAL
// =====================================================

const ADMIN_CENTRAL = {
  id: 'admin-001',
  nome: 'Central Guriri Express',
  telefone: '27999999999', // Coloque o telefone real da central
  email: 'admin@guriri.com',
};

// =====================================================
// FUNÇÃO DE IMPORTAÇÃO
// =====================================================

async function importarMotoboys() {
  console.log('🚀 Iniciando importação dos motoboys da Guriri Express...\n');

  const credentialRecorder = new CredentialRecorder('import-motoboys-reais');

  // 1. Criar usuário admin da central
  try {
    console.log('Criando usuário admin da central...');
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
    
    console.log('✅ Admin criado com sucesso!\n');
    credentialRecorder.add({
      id: ADMIN_CENTRAL.id,
      email: ADMIN_CENTRAL.email,
      role: 'central',
      password: adminPassword,
    });
  } catch (error: any) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      console.log('⚠️  Admin já existe, pulando...\n');
    } else {
      console.error('❌ Erro ao criar admin:', error.message);
    }
  }

  // 2. Criar os 10 motoboys
  let sucesso = 0;
  let erros = 0;

  for (const motoboy of MOTOBOYS_GURIRI) {
    try {
      console.log(`Processando: ${motoboy.nome} (${motoboy.telefone})...`);

      const tempPassword = generateSecurePassword(motoboy.id);
      const senhaHash = await bcrypt.hash(tempPassword, 10);

      // Criar na tabela users
      await db.insert(users).values({
        id: motoboy.id,
        name: motoboy.nome,
        role: 'motoboy',
        email: motoboy.email,
        phone: motoboy.telefone,
        password: senhaHash,
        status: 'active',
      });

      // Criar na tabela motoboys
      await db.insert(motoboys).values({
        id: motoboy.id,
        name: motoboy.nome,
        phone: motoboy.telefone,
        placa: motoboy.placa,
        cpf: motoboy.cpf,
        taxaPadrao: '7.00',
        status: 'ativo',
        online: false,
      });

      // Criar schedules para todos os dias da semana com todos os turnos habilitados
      // (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
      for (let diaSemana = 0; diaSemana <= 6; diaSemana++) {
        await db.insert(motoboySchedules).values({
          motoboyId: motoboy.id,
          diaSemana: diaSemana,
          turnoManha: true,  // 6h-12h
          turnoTarde: true,  // 12h-18h
          turnoNoite: true,  // 18h-00h
        }).onConflictDoNothing();
      }

      console.log(`✅ ${motoboy.nome} criado com sucesso (+ schedules)!`);
      sucesso++;

      credentialRecorder.add({
        id: motoboy.id,
        email: motoboy.email,
        role: 'motoboy',
        password: tempPassword,
      });
    } catch (error: any) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        console.log(`⚠️  ${motoboy.nome} já existe, pulando...`);
      } else {
        console.error(`❌ Erro ao criar ${motoboy.nome}:`, error.message);
        erros++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA IMPORTAÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Motoboys importados com sucesso: ${sucesso}`);
  console.log(`❌ Erros: ${erros}`);
  console.log('='.repeat(60));

  const credentialFile = credentialRecorder.finalize();
  console.log('\n📁 Senhas temporárias exportadas para:', credentialFile);
  console.log('   Compartilhe somente com quem precisa e delete após uso.');
  console.log('\n🎉 Importação concluída!\n');

  console.log('📝 CREDENCIAIS DE ACESSO:');
  console.log('─'.repeat(60));
  console.log('\n👨‍💼 CENTRAL (Admin):');
  console.log(`   Email: ${ADMIN_CENTRAL.email}`);
  console.log('   Senha temporária: consultar arquivo CSV gerado.');
  console.log(`   URL: http://localhost:5000/central\n`);
  
  console.log('🏍️  MOTOBOYS:');
  console.log('   Senhas únicas disponíveis no CSV gerado.');
  console.log(`   URL: http://localhost:5000/driver\n`);
  
  MOTOBOYS_GURIRI.forEach(m => {
    console.log(`   ${m.nome.padEnd(15)} - ${m.email.padEnd(25)} - ${m.telefone}`);
  });
  
  console.log('\n⚠️  IMPORTANTE:');
  console.log('1. Compartilhe as credenciais via WhatsApp com cada motoboy');
  console.log('2. Oriente-os a trocar a senha no primeiro acesso');
  console.log('3. Adicione as placas e CPFs depois diretamente no sistema');
  console.log('4. Sistema pronto para uso!\n');

  process.exit(0);
}

// Executar importação
importarMotoboys().catch((error) => {
  console.error('❌ Erro fatal na importação:', error);
  process.exit(1);
});
