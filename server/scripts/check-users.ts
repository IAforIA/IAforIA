import 'dotenv/config';
import { db } from '../db.ts';
import { users } from '@shared/schema';

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuários no banco...\n');
    
    const allUsers = await db.select().from(users);
    
    if (allUsers.length === 0) {
      console.log('❌ Nenhum usuário encontrado no banco!');
    } else {
      console.log(`✅ ${allUsers.length} usuários encontrados:\n`);
      allUsers.forEach(user => {
        console.log(`  ID: ${user.id}`);
        console.log(`  Nome: ${user.name}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Status: ${user.status}`);
        console.log(`  Password hash: ${user.password.substring(0, 20)}...`);
        console.log('---');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

checkUsers();
