import 'dotenv/config';
import { db } from '../db.ts';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function testLogin() {
  const testEmail = 'admin@guriri.com';
  const testPassword = 'admi-o4Bv3uW6Zo4p';
  
  console.log(`🔍 Testando login com ${testEmail}...\n`);
  
  const user = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);
  
  if (user.length === 0) {
    console.log('❌ Usuário não encontrado no banco!');
    process.exit(1);
  }
  
  console.log('✓ Usuário encontrado:');
  console.log(`  Nome: ${user[0].name}`);
  console.log(`  Email: ${user[0].email}`);
  console.log(`  Role: ${user[0].role}`);
  console.log(`  Hash: ${user[0].password}\n`);
  
  const isValid = await bcrypt.compare(testPassword, user[0].password);
  
  if (isValid) {
    console.log('✅ Senha VÁLIDA! Login deve funcionar.');
  } else {
    console.log('❌ Senha INVÁLIDA! Problema no hash.');
    
    // Testa criar novo hash
    const newHash = await bcrypt.hash(testPassword, 10);
    console.log(`\nNovo hash gerado: ${newHash}`);
    const testNew = await bcrypt.compare(testPassword, newHash);
    console.log(`Novo hash valida? ${testNew ? 'SIM' : 'NÃO'}`);
  }
  
  process.exit(0);
}

testLogin();
