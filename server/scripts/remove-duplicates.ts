import 'dotenv/config';
import { db } from '../db.ts';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function removeDuplicates() {
  try {
    console.log('🔍 Procurando usuários duplicados...\n');
    
    const allUsers = await db.select().from(users);
    
    // Remover usuários de teste (dev@guriri.local)
    const testUsers = allUsers.filter(u => u.email?.includes('guriri.local'));
    
    if (testUsers.length > 0) {
      console.log(`🗑️  Removendo ${testUsers.length} usuários de teste:\n`);
      for (const user of testUsers) {
        await db.delete(users).where(eq(users.id, user.id));
        console.log(`   ✓ Removido: ${user.email} (${user.name})`);
      }
    }
    
    console.log(`\n✅ Limpeza concluída!`);
    console.log(`📊 Total de usuários restantes: ${allUsers.length - testUsers.length}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

removeDuplicates();
