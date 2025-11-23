import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { users, clients } from './shared/schema.ts';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

console.log('\n🔐 CREDENCIAIS DO SISTEMA GURIRI EXPRESS\n');
console.log('======================================================================');

// Admin
console.log('\n👨‍💼 ADMIN CENTRAL:');
console.log('   Email: admin@guriri.com');
console.log('   Senha: Cristiano123');
console.log('   URL: https://www.guririexpress.com.br');

// Motoboys
console.log('\n🏍️  MOTOBOYS (10):');
const motoboys = await db.select().from(users).where(eq(users.role, 'driver'));
motoboys.forEach((m, i) => {
  console.log(`   ${i+1}. ${m.email} - Senha padrão: motoboy123`);
});

// Clientes
console.log('\n👥 CLIENTES (28):');
const clientsList = await db.select().from(clients);
clientsList.forEach((c, i) => {
  const email = c.email || c.name.toLowerCase().replace(/\s+/g, '') + '@cliente.com';
  console.log(`   ${i+1}. ${email} - Senha padrão: cliente123`);
});

console.log('\n======================================================================');
console.log('💡 IMPORTANTE: Oriente todos a trocarem a senha no primeiro acesso!\n');

await pool.end();
