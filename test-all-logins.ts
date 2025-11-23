import 'dotenv/config';
import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';

async function testAllLogins() {
  console.log('\n=== TESTANDO TODOS OS LOGINS ===\n');
  
  // Teste 1: Admin
  console.log('1. ADMIN:');
  const admin = await db.select().from(users).where(eq(users.email, 'admin@guriri.com')).limit(1);
  if (admin.length > 0) {
    const match = await bcryptjs.compare('Cristiano123', admin[0].password);
    console.log(`   Email: admin@guriri.com - Senha: Cristiano123 - ${match ? 'OK' : 'FALHOU'}`);
  } else {
    console.log('   NAO ENCONTRADO');
  }
  
  // Teste 2: Motoboy CRISTIANO
  console.log('\n2. MOTOBOY CRISTIANO:');
  const motoboy = await db.select().from(users).where(eq(users.email, 'cristiano@guriri.com')).limit(1);
  if (motoboy.length > 0) {
    const match = await bcryptjs.compare('motoboy123', motoboy[0].password);
    console.log(`   Email: cristiano@guriri.com - Senha: motoboy123 - ${match ? 'OK' : 'FALHOU'}`);
    console.log(`   Role: ${motoboy[0].role}`);
  } else {
    console.log('   NAO ENCONTRADO NA TABELA USERS');
  }
  
  // Teste 3: Cliente GURIFARMA
  console.log('\n3. CLIENTE GURIFARMA:');
  const cliente = await db.select().from(users).where(eq(users.email, 'gurifarma@cliente.com')).limit(1);
  if (cliente.length > 0) {
    const match = await bcryptjs.compare('cliente123', cliente[0].password);
    console.log(`   Email: gurifarma@cliente.com - Senha: cliente123 - ${match ? 'OK' : 'FALHOU'}`);
    console.log(`   Role: ${cliente[0].role}`);
  } else {
    console.log('   NAO ENCONTRADO NA TABELA USERS');
  }
  
  // Teste 4: Listar todos os usuarios cadastrados
  console.log('\n4. TODOS OS USUARIOS NA TABELA USERS:');
  const allUsers = await db.select({
    email: users.email,
    role: users.role,
    name: users.name
  }).from(users);
  
  console.log(`\n   Total: ${allUsers.length} usuarios`);
  allUsers.forEach(u => {
    console.log(`   - ${u.email} (${u.role}) - ${u.name}`);
  });
  
  process.exit(0);
}

testAllLogins();
