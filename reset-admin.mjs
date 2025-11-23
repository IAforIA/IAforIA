import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

const newPassword = 'Cristiano123';
const hashedPassword = await bcrypt.hash(newPassword, 10);

const result = await db.update(users)
  .set({ password: hashedPassword })
  .where(eq(users.email, 'admin@guriri.com'))
  .returning();

console.log('✅ Senha do admin resetada com sucesso!');
console.log('📧 Email: admin@guriri.com');
console.log('🔑 Senha: Cristiano123');
process.exit(0);
