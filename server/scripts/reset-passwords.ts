import 'dotenv/config';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function resetPasswords() {
  console.log('🔄 Resetando senhas para padrão "12345678"...');

  const defaultPassword = '12345678';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const targetUsers = ['central', 'client', 'motoboy'];

  try {
    // Atualiza TODOS os usuários para a senha padrão
    await db.update(users)
      .set({ password: hashedPassword });

    console.log('✅ Senhas de TODOS os usuários atualizadas com sucesso!');
    console.log('------------------------------------------------');
    console.log('NOVAS CREDENCIAIS (Para todos os usuários):');
    console.log(`Senha: ${defaultPassword}`);
    console.log('------------------------------------------------');
    console.log('Central: central.dev@guriri.local');
    console.log('Cliente: cliente.dev@guriri.local');
    console.log('Motoboy: motoboy.dev@guriri.local');
    console.log('------------------------------------------------');
  } catch (error) {
    console.error('❌ Erro ao resetar senhas:', error);
  }
  process.exit(0);
}

resetPasswords();
