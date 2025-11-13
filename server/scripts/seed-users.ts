import { db } from '../db';
import { users } from '@shared/schema';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';

async function seedUsers() {
  try {
    console.log('🌱 Criando usuários de teste...');
    
    const testUsers = [
      { id: 'central', name: 'Central Guriri', password: await bcrypt.hash('central123', 10), role: 'central' },
      { id: 'client', name: 'Cliente Exemplo', password: await bcrypt.hash('client123', 10), role: 'client' },
      { id: 'motoboy', name: 'João Motoboy', password: await bcrypt.hash('motoboy123', 10), role: 'motoboy' }
    ];

    for (const user of testUsers) {
      try {
        await db.insert(users).values(user).onConflictDoNothing();
        console.log(`✓ Usuário criado: ${user.id} (${user.role})`);
      } catch (e) {
        console.log(`- Usuário já existe: ${user.id}`);
      }
    }
    
    console.log('\n✅ Seed concluído!');
    console.log('\n📋 Credenciais de acesso:');
    console.log('   Central: central / central123');
    console.log('   Cliente: client / client123');
    console.log('   Motoboy: motoboy / motoboy123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar usuários:', error);
    process.exit(1);
  }
}

seedUsers();
