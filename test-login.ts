import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

console.log('Buscando usuário admin@guriri.com...');
const user = await db.select().from(users).where(eq(users.email, 'admin@guriri.com')).limit(1);

if (user.length === 0) {
  console.log('❌ Usuário não encontrado!');
} else {
  console.log('✅ Usuário encontrado:', {
    id: user[0].id,
    email: user[0].email,
    username: user[0].username,
    role: user[0].role,
    temSenha: user[0].password ? 'Sim' : 'Não'
  });
  
  // Testa a senha
  const senhaCorreta = await bcryptjs.compare('Cristiano123', user[0].password);
  console.log('Senha Cristiano123:', senhaCorreta ? '✅ CORRETA' : '❌ INCORRETA');
}

await pool.end();
process.exit(0);
