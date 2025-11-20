import 'dotenv/config';
import { db } from '../db.ts';
import { users } from '@shared/schema';
import bcrypt from 'bcryptjs';
import { generateSecurePassword, CredentialRecorder } from './utils/credential-helper';
import { eq } from 'drizzle-orm';

async function resetAllPasswords() {
  try {
    console.log('🔄 Resetando senhas de todos os usuários...\n');
    
    const allUsers = await db.select().from(users);
    const credentialRecorder = new CredentialRecorder('reset-all-passwords');
    
    console.log(`📋 ${allUsers.length} usuários encontrados\n`);
    
    for (const user of allUsers) {
      const tempPassword = generateSecurePassword(user.id);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));
      
      credentialRecorder.add({
        id: user.id,
        email: user.email || 'sem-email',
        role: user.role,
        password: tempPassword,
      });
      
      console.log(`✓ ${user.email || user.id} → ${tempPassword}`);
    }
    
    const csvPath = credentialRecorder.finalize();
    console.log(`\n✅ Todas as senhas foram resetadas!`);
    console.log(`🗂️  Credenciais salvas em: ${csvPath}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

resetAllPasswords();
