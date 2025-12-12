/**
 * Script para criar schedules (turnos) para todos os motoboys
 * 
 * PROBLEMA: O import-motoboys-reais.ts não cria os schedules,
 * então os motoboys não aparecem como disponíveis.
 * 
 * Este script cria schedules para todos os dias da semana com
 * todos os turnos (manhã, tarde e noite) habilitados.
 * 
 * Execute: npx tsx server/scripts/setup-motoboy-schedules.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { motoboys, motoboySchedules } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não configurada no .env');
}

const db = drizzle(neon(process.env.DATABASE_URL), { schema });

// =====================================================
// CONFIGURAÇÃO DOS TURNOS
// =====================================================

// Define quais turnos cada motoboy terá habilitados
// Por padrão, todos os turnos em todos os dias da semana
const DEFAULT_SCHEDULE = {
  turnoManha: true,  // 6h-12h
  turnoTarde: true,  // 12h-18h (ESSE ESTAVA FALTANDO!)
  turnoNoite: true,  // 18h-00h
};

// Dias da semana (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
const DIAS_SEMANA = [0, 1, 2, 3, 4, 5, 6];
const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================

async function setupSchedules() {
  console.log('🗓️  Configurando schedules (turnos) dos motoboys...\n');

  // 1. Buscar todos os motoboys
  const allMotoboys = await db.select().from(motoboys);
  
  if (allMotoboys.length === 0) {
    console.log('⚠️  Nenhum motoboy encontrado no banco de dados.');
    console.log('   Execute primeiro: npx tsx server/scripts/import-motoboys-reais.ts');
    process.exit(1);
  }

  console.log(`📋 Encontrados ${allMotoboys.length} motoboys:\n`);
  allMotoboys.forEach(m => console.log(`   - ${m.name} (${m.id})`));
  console.log('');

  let criados = 0;
  let atualizados = 0;
  let erros = 0;

  // 2. Para cada motoboy, criar schedules para todos os dias da semana
  for (const motoboy of allMotoboys) {
    console.log(`\n🏍️  Processando: ${motoboy.name}`);
    
    for (const diaSemana of DIAS_SEMANA) {
      try {
        // Verificar se já existe schedule para este dia
        const existing = await db.select()
          .from(motoboySchedules)
          .where(
            and(
              eq(motoboySchedules.motoboyId, motoboy.id),
              eq(motoboySchedules.diaSemana, diaSemana)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Atualizar schedule existente
          await db.update(motoboySchedules)
            .set({
              turnoManha: DEFAULT_SCHEDULE.turnoManha,
              turnoTarde: DEFAULT_SCHEDULE.turnoTarde,
              turnoNoite: DEFAULT_SCHEDULE.turnoNoite,
            })
            .where(
              and(
                eq(motoboySchedules.motoboyId, motoboy.id),
                eq(motoboySchedules.diaSemana, diaSemana)
              )
            );
          console.log(`   ✅ ${NOMES_DIAS[diaSemana]} - atualizado`);
          atualizados++;
        } else {
          // Criar novo schedule
          await db.insert(motoboySchedules).values({
            motoboyId: motoboy.id,
            diaSemana: diaSemana,
            turnoManha: DEFAULT_SCHEDULE.turnoManha,
            turnoTarde: DEFAULT_SCHEDULE.turnoTarde,
            turnoNoite: DEFAULT_SCHEDULE.turnoNoite,
          });
          console.log(`   ✅ ${NOMES_DIAS[diaSemana]} - criado`);
          criados++;
        }
      } catch (error: any) {
        console.error(`   ❌ Erro no ${NOMES_DIAS[diaSemana]}:`, error.message);
        erros++;
      }
    }
  }

  // 3. Resumo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO');
  console.log('='.repeat(60));
  console.log(`   Motoboys processados: ${allMotoboys.length}`);
  console.log(`   Schedules criados: ${criados}`);
  console.log(`   Schedules atualizados: ${atualizados}`);
  console.log(`   Erros: ${erros}`);
  console.log('='.repeat(60));

  // 4. Verificação
  console.log('\n🔍 Verificando schedules...\n');
  
  const allSchedules = await db.select().from(motoboySchedules);
  
  // Agrupar por motoboy
  const schedulesByMotoboy = new Map<string, typeof allSchedules>();
  for (const schedule of allSchedules) {
    const list = schedulesByMotoboy.get(schedule.motoboyId) || [];
    list.push(schedule);
    schedulesByMotoboy.set(schedule.motoboyId, list);
  }

  for (const motoboy of allMotoboys) {
    const schedules = schedulesByMotoboy.get(motoboy.id) || [];
    const turnosHoje = schedules.find(s => s.diaSemana === new Date().getDay());
    
    const status = turnosHoje 
      ? `Manhã: ${turnosHoje.turnoManha ? '✓' : '✗'} | Tarde: ${turnosHoje.turnoTarde ? '✓' : '✗'} | Noite: ${turnosHoje.turnoNoite ? '✓' : '✗'}`
      : '⚠️ Sem schedule para hoje';
    
    console.log(`   ${motoboy.name.padEnd(20)} - ${status}`);
  }

  console.log('\n🎉 Configuração de schedules concluída!');
  console.log('\n💡 Agora os motoboys devem aparecer como disponíveis no turno da tarde.\n');

  process.exit(0);
}

// Executar
setupSchedules().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
