import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import * as schema from '../../shared/schema';
import 'dotenv/config';

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

async function checkAdmin() {
  const admin = await db.select().from(users).where(eq(users.email, 'admin@guriri.com')).limit(1);
  
  if (admin.length === 0) {
    console.log('❌ Admin NÃO EXISTE no banco!');
  } else {
    console.log('✅ Admin encontrado:');
    console.log('   Email:', admin[0].email);
    console.log('   Nome:', admin[0].name);
    console.log('   Role:', admin[0].role);
    console.log('   Password Hash (primeiros 20 chars):', admin[0].password.substring(0, 20) + '...');
  }
}

checkAdmin();
