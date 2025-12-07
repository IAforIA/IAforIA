import 'dotenv/config';
import { db } from './server/db';
import { users, motoboys } from './shared/schema';
import bcryptjs from 'bcryptjs';

async function createTestMotoboys() {
  console.log('\n=== CRIANDO MOTOBOYS DE TESTE ===\n');
  
  const passwordHash = await bcryptjs.hash('motoboy123', 10);
  
  const testMotoboys = [
    { id: 'moto-test-1', name: 'Carlos Entregador', phone: '27999001122' },
    { id: 'moto-test-2', name: 'Pedro Motoboy', phone: '27999002233' },
    { id: 'moto-test-3', name: 'Rafael Express', phone: '27999003344' },
  ];
  
  for (const moto of testMotoboys) {
    // Criar na tabela motoboys
    try {
      await db.insert(motoboys).values({
        id: moto.id,
        name: moto.name,
        phone: moto.phone,
        placa: 'ABC-1234',
        status: 'ativo',
        available: true,
        taxaPadrao: '7.00'
      }).onConflictDoNothing();
      
      console.log(`✅ Motoboy criado: ${moto.name}`);
    } catch (error) {
      console.log(`⚠️  Motoboy ${moto.name} ja existe`);
    }
    
    // Criar na tabela users
    try {
      await db.insert(users).values({
        id: moto.id,
        name: moto.name,
        email: `${moto.id}@guriri.local`,
        phone: moto.phone,
        role: 'motoboy',
        password: passwordHash,
        status: 'active'
      }).onConflictDoNothing();
      
      console.log(`   Email: ${moto.id}@guriri.local`);
      console.log(`   Senha: motoboy123\n`);
    } catch (error) {
      console.log(`   Usuario ja existe\n`);
    }
  }
  
  console.log('=== CONCLUIDO ===');
  console.log('Agora voce tem 3 motoboys de teste para reatribuicao!');
  
  process.exit(0);
}

createTestMotoboys().catch((error) => {
  console.error('Erro:', error);
  process.exit(1);
});
