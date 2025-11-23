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

const newPassword = 'Cristiano123';
const hashedPassword = await bcryptjs.hash(newPassword, 10);

const result = await db.update(users)
  .set({ password: hashedPassword })
  .where(eq(users.email, 'admin@guriri.com'))
  .returning();

console.log('✅ Senha do admin resetada com sucesso!');
console.log('📧 Email: admin@guriri.com');
console.log('🔑 Senha: Cristiano123');
console.log('Usuário atualizado:', result[0]?.username);

await pool.end();
process.exit(0);
