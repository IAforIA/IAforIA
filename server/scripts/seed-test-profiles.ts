/**
 * ARQUIVO: server/scripts/seed-test-profiles.ts
 * PROPÓSITO: Cria registros de cliente e motoboy para os usuários de teste
 * USO: npx tsx server/scripts/seed-test-profiles.ts
 */

import 'dotenv/config';
import { db } from '../db';
import { clients, motoboys } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function seedTestProfiles() {
  console.log('🌱 Criando perfis de teste...\n');

  try {
    // Verifica se já existe cliente de teste
    const existingClient = await db.select().from(clients).where(eq(clients.id, 'client')).limit(1);
    
    if (existingClient.length === 0) {
      // Cria perfil de cliente de teste
      await db.insert(clients).values({
        id: 'client',
        name: 'Cliente Exemplo',
        phone: '00000000001',
        email: 'cliente.dev@guriri.local',
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
        geoLat: null,
        geoLng: null,
        mensalidade: '150.00',
        horarioFuncionamento: '08:00 AS 18:00 SEG A SEXTA'
      });
      console.log('✅ Cliente de teste criado (id: client)');
    } else {
      console.log('ℹ️  Cliente de teste já existe');
    }

    // Verifica se já existe motoboy de teste
    const existingMotoboy = await db.select().from(motoboys).where(eq(motoboys.id, 'motoboy')).limit(1);
    
    if (existingMotoboy.length === 0) {
      // Cria perfil de motoboy de teste
      await db.insert(motoboys).values({
        id: 'motoboy',
        name: 'João Motoboy',
        phone: '00000000002',
        placa: 'ABC-1234',
        cpf: '12345678900',
        taxaPadrao: '7.00',
        status: 'ativo',
        available: true
      });
      console.log('✅ Motoboy de teste criado (id: motoboy)');
    } else {
      console.log('ℹ️  Motoboy de teste já existe');
    }

    console.log('\n✅ Seed concluído!\n');
    console.log('CREDENCIAIS:');
    console.log('Cliente  → cliente.dev@guriri.local / clie-vcfHp1NsDfMb');
    console.log('Motoboy  → motoboy.dev@guriri.local / moto-BymgxfK2Jxbp');
    console.log('Central  → central.dev@guriri.local / cent-iOIBtXJYyCY0');
    console.log();
    
  } catch (error) {
    console.error('💥 Erro ao criar perfis:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

seedTestProfiles();
