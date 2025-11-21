import 'dotenv/config';
import { db } from "../db";
import { motoboys, motoboySchedules } from "../../shared/schema";
import { eq } from "drizzle-orm";

// Extracted from WhatsApp screenshot - real working hours
const MOTOBOY_SCHEDULES = [
  {
    name: "JOÃO",
    schedule: {
      // segunda 9:00-14:00 (Manhã)
      1: { manha: true, tarde: false, noite: false },
      // terça day off
      2: { manha: false, tarde: false, noite: false },
      // quarta 9:00-14:00 (Manhã)
      3: { manha: true, tarde: false, noite: false },
      // quinta 9:00-14:00 (Manhã)
      4: { manha: true, tarde: false, noite: false },
      // sexta 9:00-14:00 (Manhã)
      5: { manha: true, tarde: false, noite: false },
      // sábado 17:00-23:30 (Noite)
      6: { manha: false, tarde: false, noite: true },
      // domingo 17:00-23:30 (Noite)
      0: { manha: false, tarde: false, noite: true },
    }
  },
  {
    name: "YURI",
    schedule: {
      // segunda 9:00-14:00 (Manhã)
      1: { manha: true, tarde: false, noite: false },
      // terça 9:00-14:00 (Manhã)
      2: { manha: true, tarde: false, noite: false },
      // quarta day off
      3: { manha: false, tarde: false, noite: false },
      // quinta 9:00-14:00 (Manhã)
      4: { manha: true, tarde: false, noite: false },
      // sexta 9:00-14:00 (Manhã)
      5: { manha: true, tarde: false, noite: false },
      // sábado 17:00-23:30 (Noite)
      6: { manha: false, tarde: false, noite: true },
      // domingo 17:00-23:30 (Noite)
      0: { manha: false, tarde: false, noite: true },
    }
  },
  {
    name: "DOUGLAS",
    schedule: {
      // segunda 9:00-14:00 (Manhã)
      1: { manha: true, tarde: false, noite: false },
      // terça 9:00-14:00 (Manhã)
      2: { manha: true, tarde: false, noite: false },
      // quarta 9:00-14:00 (Manhã)
      3: { manha: true, tarde: false, noite: false },
      // quinta day off
      4: { manha: false, tarde: false, noite: false },
      // sexta 9:00-14:00 (Manhã)
      5: { manha: true, tarde: false, noite: false },
      // sábado 17:00-23:30 (Noite)
      6: { manha: false, tarde: false, noite: true },
      // domingo 17:00-23:30 (Noite)
      0: { manha: false, tarde: false, noite: true },
    }
  },
  {
    name: "BRUNO",
    schedule: {
      // segunda 9:00-14:00 (Manhã)
      1: { manha: true, tarde: false, noite: false },
      // terça 9:00-14:00 (Manhã)
      2: { manha: true, tarde: false, noite: false },
      // quarta 9:00-14:00 (Manhã)
      3: { manha: true, tarde: false, noite: false },
      // quinta 9:00-14:00 (Manhã)
      4: { manha: true, tarde: false, noite: false },
      // sexta day off
      5: { manha: false, tarde: false, noite: false },
      // sábado 17:00-23:30 (Noite)
      6: { manha: false, tarde: false, noite: true },
      // domingo 17:00-23:30 (Noite)
      0: { manha: false, tarde: false, noite: true },
    }
  },
  {
    name: "GUILHERME",
    schedule: {
      // segunda 9:00-14:00 (Manhã)
      1: { manha: true, tarde: false, noite: false },
      // terça 9:00-14:00 (Manhã)
      2: { manha: true, tarde: false, noite: false },
      // quarta 9:00-14:00 (Manhã)
      3: { manha: true, tarde: false, noite: false },
      // quinta 9:00-14:00 (Manhã)
      4: { manha: true, tarde: false, noite: false },
      // sexta 9:00-14:00 (Manhã)
      5: { manha: true, tarde: false, noite: false },
      // sábado day off
      6: { manha: false, tarde: false, noite: false },
      // domingo 17:00-23:30 (Noite)
      0: { manha: false, tarde: false, noite: true },
    }
  },
  {
    name: "VICTOR HUGO",
    schedule: {
      // segunda 9:00-14:00 (Manhã)
      1: { manha: true, tarde: false, noite: false },
      // terça 9:00-14:00 (Manhã)
      2: { manha: true, tarde: false, noite: false },
      // quarta 9:00-14:00 (Manhã)
      3: { manha: true, tarde: false, noite: false },
      // quinta 9:00-14:00 (Manhã)
      4: { manha: true, tarde: false, noite: false },
      // sexta 9:00-14:00 (Manhã)
      5: { manha: true, tarde: false, noite: false },
      // sábado 17:00-23:30 (Noite)
      6: { manha: false, tarde: false, noite: true },
      // domingo day off
      0: { manha: false, tarde: false, noite: false },
    }
  },
  {
    name: "OTAVIO",
    schedule: {
      // segunda day off
      1: { manha: false, tarde: false, noite: false },
      // terça 9:00-14:00 (Manhã)
      2: { manha: true, tarde: false, noite: false },
      // quarta 9:00-14:00 (Manhã)
      3: { manha: true, tarde: false, noite: false },
      // quinta 9:00-14:00 (Manhã)
      4: { manha: true, tarde: false, noite: false },
      // sexta 9:00-14:00 (Manhã)
      5: { manha: true, tarde: false, noite: false },
      // sábado 17:00-23:30 (Noite)
      6: { manha: false, tarde: false, noite: true },
      // domingo 17:00-23:30 (Noite)
      0: { manha: false, tarde: false, noite: true },
    }
  },
  {
    name: "DAVI",
    schedule: {
      // segunda 9:00-14:00 (Manhã)
      1: { manha: true, tarde: false, noite: false },
      // terça day off
      2: { manha: false, tarde: false, noite: false },
      // quarta 9:00-14:00 (Manhã)
      3: { manha: true, tarde: false, noite: false },
      // quinta 9:00-14:00 (Manhã)
      4: { manha: true, tarde: false, noite: false },
      // sexta 9:00-14:00 (Manhã)
      5: { manha: true, tarde: false, noite: false },
      // sábado 17:00-23:30 (Noite)
      6: { manha: false, tarde: false, noite: true },
      // domingo 17:00-23:30 (Noite)
      0: { manha: false, tarde: false, noite: true },
    }
  },
  {
    name: "FELIPE",
    schedule: {
      // segunda 9:00-14:00 (Manhã)
      1: { manha: true, tarde: false, noite: false },
      // terça 9:00-14:00 (Manhã)
      2: { manha: true, tarde: false, noite: false },
      // quarta day off
      3: { manha: false, tarde: false, noite: false },
      // quinta 9:00-14:00 (Manhã)
      4: { manha: true, tarde: false, noite: false },
      // sexta 9:00-14:00 (Manhã)
      5: { manha: true, tarde: false, noite: false },
      // sábado 17:00-23:30 (Noite)
      6: { manha: false, tarde: false, noite: true },
      // domingo 17:00-23:30 (Noite)
      0: { manha: false, tarde: false, noite: true },
    }
  },
  {
    name: "CRISTIANO",
    schedule: {
      // segunda 9:00-14:00 (Manhã)
      1: { manha: true, tarde: false, noite: false },
      // terça 9:00-14:00 (Manhã)
      2: { manha: true, tarde: false, noite: false },
      // quarta 9:00-14:00 (Manhã)
      3: { manha: true, tarde: false, noite: false },
      // quinta day off
      4: { manha: false, tarde: false, noite: false },
      // sexta 9:00-14:00 (Manhã)
      5: { manha: true, tarde: false, noite: false },
      // sábado 17:00-23:30 (Noite)
      6: { manha: false, tarde: false, noite: true },
      // domingo 17:00-23:30 (Noite)
      0: { manha: false, tarde: false, noite: true },
    }
  },
];

async function seedMotoboySchedules() {
  console.log("🕐 Starting motoboy schedules seed...");

  try {
    // Get all motoboys from database
    const allMotoboys = await db.select().from(motoboys);
    console.log(`📋 Found ${allMotoboys.length} motoboys in database`);

    let totalInserted = 0;

    for (const scheduleData of MOTOBOY_SCHEDULES) {
      // Find motoboy by name
      const motoboy = allMotoboys.find(
        (m) => m.name.toUpperCase() === scheduleData.name.toUpperCase()
      );

      if (!motoboy) {
        console.log(`⚠️  Motoboy ${scheduleData.name} not found in database, skipping...`);
        continue;
      }

      console.log(`📅 Processing schedules for ${motoboy.name}...`);

      // Insert schedule entries for each day (0=Sunday to 6=Saturday)
      for (const [day, shifts] of Object.entries(scheduleData.schedule)) {
        const diaSemana = parseInt(day);
        
        // Skip if all shifts are false (day off)
        if (!shifts.manha && !shifts.tarde && !shifts.noite) {
          continue;
        }

        await db.insert(motoboySchedules).values({
          motoboyId: motoboy.id,
          diaSemana,
          turnoManha: shifts.manha,
          turnoTarde: shifts.tarde,
          turnoNoite: shifts.noite,
        });

        totalInserted++;
      }
    }

    console.log(`✅ Successfully inserted ${totalInserted} schedule entries`);
    console.log("🎉 Motoboy schedules seed completed!");

  } catch (error) {
    console.error("❌ Error seeding motoboy schedules:", error);
    throw error;
  }
}

// Run if called directly
seedMotoboySchedules()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });

export { seedMotoboySchedules };
