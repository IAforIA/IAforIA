import 'dotenv/config';
import { db } from "../db";
import { clients, clientSchedules } from "../../shared/schema";
import { eq } from "drizzle-orm";

// Mapping Portuguese days to numbers (0=Sunday to 6=Saturday)
const DAY_MAP: Record<string, number> = {
  'DOMINGO': 0,
  'DOM': 0,
  'SEGUNDA': 1,
  'SEG': 1,
  'TERÇA': 2,
  'TERCA': 2,
  'TER': 2,
  'QUARTA': 3,
  'QUA': 3,
  'QUINTA': 4,
  'QUI': 4,
  'SEXTA': 5,
  'SEX': 5,
  'SÁBADO': 6,
  'SABADO': 6,
  'SAB': 6,
};

interface ParsedSchedule {
  diaSemana: number;
  horaAbertura: string;
  horaFechamento: string;
  fechado: boolean;
}

/**
 * Parse time range like "18:00 AS 23:00" into [opening, closing]
 */
function parseTimeRange(text: string): [string, string] | null {
  const match = text.match(/(\d{2}:\d{2})\s*(?:AS|A)\s*(\d{2}:\d{2})/i);
  if (match) {
    return [match[1], match[2]];
  }
  return null;
}

/**
 * Parse day range like "SEG A QUINTA" into array of day numbers
 */
function parseDayRange(text: string): number[] {
  const days: number[] = [];
  
  // Normalize text: remove accents and convert to uppercase
  const normalizedText = text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
  
  // Check for range pattern "SEG A QUINTA" or "TERCA A DOMINGO"
  const rangeMatch = normalizedText.match(/(\w+)\s+A\s+(\w+)/i);
  if (rangeMatch) {
    const startKey = rangeMatch[1];
    const endKey = rangeMatch[2];
    const start = DAY_MAP[startKey];
    const end = DAY_MAP[endKey];
    
    if (start !== undefined && end !== undefined) {
      // Handle wrap-around (e.g., SEXTA A DOMINGO: 5,6,0)
      if (start <= end) {
        for (let i = start; i <= end; i++) {
          days.push(i);
        }
      } else {
        for (let i = start; i <= 6; i++) {
          days.push(i);
        }
        for (let i = 0; i <= end; i++) {
          days.push(i);
        }
      }
    }
  } else {
    // Check for individual days or slash/E-separated "SABADO/DOMINGO" or "SABADO E DOMINGO"
    const dayParts = normalizedText.split(/[\/\sE\s]+/).map(d => d.trim()).filter(Boolean);
    for (const part of dayParts) {
      const dayNum = DAY_MAP[part];
      if (dayNum !== undefined) {
        days.push(dayNum);
      }
    }
  }
  
  return days;
}

/**
 * Parse client schedule text into structured data
 * Examples:
 * - "18:00 AS 23:00 SEG A QUINTA | SEXTA A DOMINGO 18:00 AS 23:30"
 * - "09:00 AS 22:00 SEG A DOMINGO"
 * - "18:00 AS 22:30 SEG A DOMINGO FOLGA TERÇA"
 */
function parseClientSchedule(scheduleText: string): ParsedSchedule[] {
  const schedules: ParsedSchedule[] = [];
  const closedDays = new Set<number>();
  
  // Extract "FOLGA" days first
  const folgaMatch = scheduleText.match(/FOLGA\s+([\w\s/E]+?)(?:\||$)/i);
  if (folgaMatch) {
    const folgaText = folgaMatch[1].trim();
    const folgaDays = parseDayRange(folgaText);
    folgaDays.forEach(day => closedDays.add(day));
  }
  
  // Split by pipe | to handle multiple schedule blocks
  const blocks = scheduleText.split('|').map(b => b.trim());
  
  for (const block of blocks) {
    // Skip if this is just a FOLGA declaration
    if (block.toUpperCase().startsWith('FOLGA')) continue;
    
    // Extract time range
    const timeRange = parseTimeRange(block);
    if (!timeRange) continue;
    
    const [opening, closing] = timeRange;
    
    // Extract days
    const daysText = block.replace(/\d{2}:\d{2}\s*(?:AS|A)\s*\d{2}:\d{2}/gi, '').trim();
    const days = parseDayRange(daysText);
    
    // Create schedule entries
    for (const day of days) {
      if (!closedDays.has(day)) {
        schedules.push({
          diaSemana: day,
          horaAbertura: opening,
          horaFechamento: closing,
          fechado: false,
        });
      }
    }
  }
  
  // Add closed days explicitly
  closedDays.forEach(day => {
    schedules.push({
      diaSemana: day,
      horaAbertura: '00:00',
      horaFechamento: '00:00',
      fechado: true,
    });
  });
  
  return schedules;
}

async function seedClientSchedules() {
  console.log("🕐 Starting client schedules seed...");

  try {
    // Get all clients from database
    const allClients = await db.select().from(clients);
    console.log(`📋 Found ${allClients.length} clients in database`);

    let totalInserted = 0;
    let parseErrors = 0;

    for (const client of allClients) {
      if (!client.horarioFuncionamento) {
        console.log(`⚠️  Client ${client.name} has no schedule data, skipping...`);
        continue;
      }

      console.log(`📅 Processing schedule for ${client.name}...`);
      console.log(`   Raw: "${client.horarioFuncionamento}"`);

      try {
        const schedules = parseClientSchedule(client.horarioFuncionamento);
        
        if (schedules.length === 0) {
          console.log(`   ⚠️  No valid schedules parsed`);
          parseErrors++;
          continue;
        }

        // Insert each schedule entry
        for (const schedule of schedules) {
          await db.insert(clientSchedules).values({
            clientId: client.id,
            diaSemana: schedule.diaSemana,
            horaAbertura: schedule.horaAbertura,
            horaFechamento: schedule.horaFechamento,
            fechado: schedule.fechado,
          });
          totalInserted++;
        }

        console.log(`   ✅ Inserted ${schedules.length} schedule entries`);
      } catch (error) {
        console.error(`   ❌ Error parsing schedule: ${error}`);
        parseErrors++;
      }
    }

    console.log(`\n✅ Successfully inserted ${totalInserted} schedule entries`);
    if (parseErrors > 0) {
      console.log(`⚠️  ${parseErrors} clients had parsing errors`);
    }
    console.log("🎉 Client schedules seed completed!");

  } catch (error) {
    console.error("❌ Error seeding client schedules:", error);
    throw error;
  }
}

// Run if called directly
seedClientSchedules()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });

export { seedClientSchedules };
