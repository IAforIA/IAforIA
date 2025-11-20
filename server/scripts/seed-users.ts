import 'dotenv/config';
import { db } from '../db.ts';
import { users } from '@shared/schema';
import bcrypt from 'bcryptjs';
import { generateSecurePassword, CredentialRecorder } from './utils/credential-helper';
import { eq, inArray } from 'drizzle-orm';

async function seedUsers() {
  try {
    console.log('🌱 Criando usuários de teste...');

    // Define o tipo para garantir que os objetos de usuário estejam corretos antes do hash
    const testUsers = [
      { id: 'central', name: 'Central Guriri', role: 'central', email: 'central.dev@guriri.local', phone: '00000000000' },
      { id: 'client', name: 'Cliente Exemplo', role: 'client', email: 'cliente.dev@guriri.local', phone: '00000000001' },
      { id: 'motoboy', name: 'João Motoboy', role: 'motoboy', email: 'motoboy.dev@guriri.local', phone: '00000000002' }
    ];

    // Mapeia e gera os hashes das senhas em paralelo para melhor performance
    const credentialRecorder = new CredentialRecorder('seed-users');
    const credentials: { id: string; role: string; password: string }[] = [];
    
    // REMOVE usuários antigos para garantir que a senha nova seja aplicada
    console.log('🧹 Removendo usuários de teste antigos...');
    await db.delete(users).where(inArray(users.id, testUsers.map(u => u.id)));

    const hashedUsers = await Promise.all(testUsers.map(async (user) => {
      const tempPassword = generateSecurePassword(user.id);
      credentials.push({ id: user.id, role: user.role, password: tempPassword });
      credentialRecorder.add({
        id: user.id,
        email: user.email,
        role: user.role,
        password: tempPassword,
      });
      return {
        ...user,
        password: await bcrypt.hash(tempPassword, 10),
        status: 'active',
      };
    }));

    // Tenta inserir todos de uma vez
    await db.insert(users)
      .values(hashedUsers as any); // Cast to any to avoid strict enum type check in seed script

    console.log(`✓ Usuários criados: ${hashedUsers.map(u => u.id).join(', ')}`);

    console.log('\n✅ Seed concluído!');
    console.log('\n📋 Credenciais de acesso (ambiente de desenvolvimento):');
    credentials.forEach((cred) => {
      // Encontra o email correspondente ao ID
      const userEmail = testUsers.find(u => u.id === cred.id)?.email || 'N/A';
      console.log(`   ${cred.role.padEnd(8)} → ${userEmail} / ${cred.password}`);
    });

    const csvPath = credentialRecorder.finalize();
    console.log(`\n🗂️ Arquivo CSV salvo em: ${csvPath}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar usuários:', error);
    process.exit(1);
  }
}

seedUsers();
