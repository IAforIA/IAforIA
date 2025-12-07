import { and, desc, eq } from 'drizzle-orm';
import { db } from './db.js';
import { motoboyLocations, motoboySchedules, motoboys, type InsertMotoboy, type Motoboy } from '@shared/schema';

export async function getAllMotoboys() {
  return await db.select().from(motoboys);
}

export async function getMotoboy(id: string) {
  const result = await db.select().from(motoboys).where(eq(motoboys.id, id)).limit(1);
  return result[0];
}

export async function updateMotoboyOnlineStatus(id: string, online: boolean) {
  await db.update(motoboys)
    .set({ online, updatedAt: new Date() })
    .where(eq(motoboys.id, id));
}

export async function createMotoboy(insertMotoboy: InsertMotoboy) {
  const result = await db.insert(motoboys).values(insertMotoboy).returning();
  return result[0];
}

export async function updateMotoboy(id: string, data: Partial<Motoboy>) {
  await db.update(motoboys).set(data).where(eq(motoboys.id, id));
}

export async function setMotoboyOnline(id: string, online: boolean) {
  await db.update(motoboys).set({ online }).where(eq(motoboys.id, id));
}

export async function updateMotoboyLocation(id: string, lat: number, lng: number) {
  const newLocation = {
    motoboyId: id,
    latitude: lat.toString(),
    longitude: lng.toString(),
  };
  await db.insert(motoboyLocations).values(newLocation);
}

export async function getLatestMotoboyLocations() {
  const allLocations = await db.select().from(motoboyLocations).orderBy(desc(motoboyLocations.timestamp));
  const latestByMotoboy = new Map<string, any>();

  for (const location of allLocations) {
    if (!latestByMotoboy.has(location.motoboyId)) {
      const normalized = {
        ...location,
        latitude: typeof location.latitude === 'string' ? parseFloat(location.latitude) : location.latitude,
        longitude: typeof location.longitude === 'string' ? parseFloat(location.longitude) : location.longitude,
      };
      latestByMotoboy.set(location.motoboyId, normalized);
    }
  }

  return latestByMotoboy;
}

export async function getMotoboySchedules(motoboyId: string) {
  return await db
    .select()
    .from(motoboySchedules)
    .where(eq(motoboySchedules.motoboyId, motoboyId))
    .orderBy(motoboySchedules.diaSemana);
}

export async function upsertMotoboySchedule(
  motoboyId: string,
  diaSemana: number,
  turnoManha: boolean,
  turnoTarde: boolean,
  turnoNoite: boolean,
) {
  await db
    .delete(motoboySchedules)
    .where(and(eq(motoboySchedules.motoboyId, motoboyId), eq(motoboySchedules.diaSemana, diaSemana)));

  if (turnoManha || turnoTarde || turnoNoite) {
    const result = await db
      .insert(motoboySchedules)
      .values({ motoboyId, diaSemana, turnoManha, turnoTarde, turnoNoite })
      .returning();
    return result[0];
  }

  return null;
}

export async function deleteMotoboySchedule(id: string) {
  await db.delete(motoboySchedules).where(eq(motoboySchedules.id, id));
}
