import 'dotenv/config';
import { db } from '../db.ts';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Script para corrigir as roles dos usuários de teste que foram trocadas
 * 
 * PROBLEMA:
 * - user id='client' tem role='motoboy' (ERRADO!)
 * - user id='motoboy' tem role='client' (ERRADO!)
 * 
 * SOLUÇÃO:
 * - user id='client' deve ter role='client'
 * - user id='motoboy' deve ter role='motoboy'
 */

async function fixTestUserRoles() {
  try {
    console.log('🔧 Verificando roles dos usuários de teste...\n');

    // 1. Buscar usuários de teste
    const clientUser = await db.select().from(users).where(eq(users.id, 'client'));
    const motoboyUser = await db.select().from(users).where(eq(users.id, 'motoboy'));

    console.log('📋 Estado atual:');
    console.log(`   client: role=${clientUser[0]?.role || 'NOT FOUND'}`);
    console.log(`   motoboy: role=${motoboyUser[0]?.role || 'NOT FOUND'}\n`);

    // 2. Corrigir se necessário
    let fixed = 0;

    if (clientUser[0] && clientUser[0].role !== 'client') {
      console.log(`🔧 Corrigindo: client (role: ${clientUser[0].role} → client)`);
      await db.update(users)
        .set({ role: 'client' })
        .where(eq(users.id, 'client'));
      fixed++;
    }

    if (motoboyUser[0] && motoboyUser[0].role !== 'motoboy') {
      console.log(`🔧 Corrigindo: motoboy (role: ${motoboyUser[0].role} → motoboy)`);
      await db.update(users)
        .set({ role: 'motoboy' })
        .where(eq(users.id, 'motoboy'));
      fixed++;
    }

    if (fixed === 0) {
      console.log('✅ Roles já estão corretas! Nada a fazer.');
    } else {
      console.log(`\n✅ ${fixed} role(s) corrigida(s) com sucesso!`);
      
      // Verificar novamente
      const clientUserAfter = await db.select().from(users).where(eq(users.id, 'client'));
      const motoboyUserAfter = await db.select().from(users).where(eq(users.id, 'motoboy'));
      
      console.log('\n📋 Estado final:');
      console.log(`   client: role=${clientUserAfter[0]?.role || 'NOT FOUND'}`);
      console.log(`   motoboy: role=${motoboyUserAfter[0]?.role || 'NOT FOUND'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao corrigir roles:', error);
    process.exit(1);
  }
}

fixTestUserRoles();
