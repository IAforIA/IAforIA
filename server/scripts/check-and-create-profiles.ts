import 'dotenv/config';
import { db } from '../db.ts';
import { users, motoboys, clients } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Script para verificar e criar perfis de motoboy/client faltantes
 */

async function checkAndCreateProfiles() {
  try {
    console.log('🔍 Verificando perfis dos usuários de teste...\n');

    // 1. Verificar usuário motoboy
    const motoboyUser = await db.select().from(users).where(eq(users.id, 'motoboy'));
    
    if (motoboyUser.length > 0) {
      console.log(`✅ Usuário 'motoboy' encontrado (role: ${motoboyUser[0].role})`);
      
      // Verificar se existe perfil de motoboy
      const motoboyProfile = await db.select().from(motoboys).where(eq(motoboys.id, 'motoboy'));
      
      if (motoboyProfile.length === 0) {
        console.log('   ⚠️  Perfil de motoboy NÃO existe! Criando...');
        
        await db.insert(motoboys).values({
          id: 'motoboy',
          name: motoboyUser[0].name,
          phone: motoboyUser[0].phone,
          placa: 'ABC-1234',
          cpf: '12345678900',
          taxaPadrao: '7.00',
          status: 'ativo',
          online: false,
        });
        
        console.log('   ✅ Perfil de motoboy criado!');
      } else {
        console.log('   ✅ Perfil de motoboy já existe');
      }
    } else {
      console.log('❌ Usuário motoboy NÃO encontrado');
    }

    // 2. Verificar usuário client
    const clientUser = await db.select().from(users).where(eq(users.id, 'client'));
    
    if (clientUser.length > 0) {
      console.log(`\n✅ Usuário 'client' encontrado (role: ${clientUser[0].role})`);
      
      // Verificar se existe perfil de cliente
      const clientProfile = await db.select().from(clients).where(eq(clients.id, 'client'));
      
      if (clientProfile.length === 0) {
        console.log('   ⚠️  Perfil de cliente NÃO existe! Criando...');
        
        await db.insert(clients).values({
          id: 'client',
          name: clientUser[0].name,
          phone: clientUser[0].phone,
          email: clientUser[0].email,
          company: 'Empresa Teste LTDA',
          documentType: 'PJ',
          documentNumber: '12345678000190',
          ie: '123456789',
          cep: '29900-000',
          rua: 'Rua Teste',
          numero: '100',
          bairro: 'Centro',
          complemento: 'Sala 1',
          referencia: 'Próximo ao banco',
          mensalidade: '150.00',
          horarioFuncionamento: '08:00 AS 18:00 SEG A SEXTA',
        });
        
        console.log('   ✅ Perfil de cliente criado!');
      } else {
        console.log('   ✅ Perfil de cliente já existe');
      }
    } else {
      console.log('❌ Usuário client NÃO encontrado');
    }

    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

checkAndCreateProfiles();
