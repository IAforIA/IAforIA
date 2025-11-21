import 'dotenv/config';
import { db } from "../db";
import { motoboys, motoboySchedules, clients, clientSchedules } from "../../shared/schema";
import { eq } from "drizzle-orm";

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const SHIFT_NAMES = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };

async function testSchedules() {
  console.log('🧪 TESTING SCHEDULE DATA\n');
  console.log('='.repeat(80));

  // Test 1: Count motoboy schedules
  console.log('\n📊 TEST 1: Motoboy Schedules Count');
  const motoboyScheduleCount = await db.select().from(motoboySchedules);
  console.log(`✅ Found ${motoboyScheduleCount.length} motoboy schedule entries`);

  // Test 2: Sample motoboy schedule (JOÃO)
  console.log('\n📊 TEST 2: Sample Motoboy Schedule (JOÃO)');
  const joao = await db.select().from(motoboys).where(eq(motoboys.name, 'JOÃO'));
  if (joao.length > 0) {
    const joaoSchedules = await db.select()
      .from(motoboySchedules)
      .where(eq(motoboySchedules.motoboyId, joao[0].id))
      .orderBy(motoboySchedules.diaSemana);
    
    console.log(`\nJOÃO's availability:`);
    joaoSchedules.forEach(s => {
      const shifts = [];
      if (s.turnoManha) shifts.push(SHIFT_NAMES.manha);
      if (s.turnoTarde) shifts.push(SHIFT_NAMES.tarde);
      if (s.turnoNoite) shifts.push(SHIFT_NAMES.noite);
      console.log(`  ${DAY_NAMES[s.diaSemana]}: ${shifts.join(', ') || 'Folga'}`);
    });
  }

  // Test 3: Count client schedules
  console.log('\n📊 TEST 3: Client Schedules Count');
  const clientScheduleCount = await db.select().from(clientSchedules);
  console.log(`✅ Found ${clientScheduleCount.length} client schedule entries`);

  // Test 4: Sample client schedule (SAMPAIO)
  console.log('\n📊 TEST 4: Sample Client Schedule (SAMPAIO)');
  const sampaio = await db.select().from(clients).where(eq(clients.name, 'SAMPAIO'));
  if (sampaio.length > 0) {
    console.log(`\nOriginal text: "${sampaio[0].horarioFuncionamento}"`);
    
    const sampaioSchedules = await db.select()
      .from(clientSchedules)
      .where(eq(clientSchedules.clientId, sampaio[0].id))
      .orderBy(clientSchedules.diaSemana);
    
    console.log(`\nParsed schedules:`);
    sampaioSchedules.forEach(s => {
      if (s.fechado) {
        console.log(`  ${DAY_NAMES[s.diaSemana]}: FECHADO`);
      } else {
        console.log(`  ${DAY_NAMES[s.diaSemana]}: ${s.horaAbertura} - ${s.horaFechamento}`);
      }
    });
  }

  // Test 5: Complex client schedule (MONICA - has multiple time blocks)
  console.log('\n📊 TEST 5: Complex Client Schedule (MONICA)');
  const monica = await db.select().from(clients).where(eq(clients.name, 'MONICA'));
  if (monica.length > 0) {
    console.log(`\nOriginal text: "${monica[0].horarioFuncionamento}"`);
    
    const monicaSchedules = await db.select()
      .from(clientSchedules)
      .where(eq(clientSchedules.clientId, monica[0].id))
      .orderBy(clientSchedules.diaSemana);
    
    console.log(`\nParsed schedules:`);
    monicaSchedules.forEach(s => {
      if (s.fechado) {
        console.log(`  ${DAY_NAMES[s.diaSemana]}: FECHADO`);
      } else {
        console.log(`  ${DAY_NAMES[s.diaSemana]}: ${s.horaAbertura} - ${s.horaFechamento}`);
      }
    });
  }

  // Test 6: Client with FOLGA days (OISHI)
  console.log('\n📊 TEST 6: Client with FOLGA days (OISHI)');
  const oishi = await db.select().from(clients).where(eq(clients.name, 'OISHI'));
  if (oishi.length > 0) {
    console.log(`\nOriginal text: "${oishi[0].horarioFuncionamento}"`);
    
    const oishiSchedules = await db.select()
      .from(clientSchedules)
      .where(eq(clientSchedules.clientId, oishi[0].id))
      .orderBy(clientSchedules.diaSemana);
    
    console.log(`\nParsed schedules:`);
    oishiSchedules.forEach(s => {
      if (s.fechado) {
        console.log(`  ${DAY_NAMES[s.diaSemana]}: FECHADO`);
      } else {
        console.log(`  ${DAY_NAMES[s.diaSemana]}: ${s.horaAbertura} - ${s.horaFechamento}`);
      }
    });
  }

  // Test 7: All motoboys coverage
  console.log('\n📊 TEST 7: All Motoboys Coverage');
  const allMotoboys = await db.select().from(motoboys);
  for (const motoboy of allMotoboys) {
    const schedules = await db.select()
      .from(motoboySchedules)
      .where(eq(motoboySchedules.motoboyId, motoboy.id));
    console.log(`  ${motoboy.name}: ${schedules.length} schedule entries`);
  }

  // Test 8: Statistics
  console.log('\n📊 TEST 8: Statistics');
  const clientsWithSchedules = await db.select({ clientId: clientSchedules.clientId })
    .from(clientSchedules)
    .groupBy(clientSchedules.clientId);
  
  const motoboysWithSchedules = await db.select({ motoboyId: motoboySchedules.motoboyId })
    .from(motoboySchedules)
    .groupBy(motoboySchedules.motoboyId);
  
  console.log(`  Clients with schedules: ${clientsWithSchedules.length}`);
  console.log(`  Motoboys with schedules: ${motoboysWithSchedules.length}`);
  console.log(`  Total client schedule entries: ${clientScheduleCount.length}`);
  console.log(`  Total motoboy schedule entries: ${motoboyScheduleCount.length}`);
  console.log(`  Average entries per client: ${(clientScheduleCount.length / clientsWithSchedules.length).toFixed(1)}`);
  console.log(`  Average entries per motoboy: ${(motoboyScheduleCount.length / motoboysWithSchedules.length).toFixed(1)}`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ ALL TESTS COMPLETED\n');
}

testSchedules()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
