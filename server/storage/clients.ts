import { desc, eq } from 'drizzle-orm';
import { db } from './db.js';
import { clientSchedules, clients, type Client } from '@shared/schema';

export async function getAllClients() {
  return await db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function updateClient(clientId: string, data: Partial<Client>) {
  const result = await db.update(clients).set(data).where(eq(clients.id, clientId)).returning();
  return result[0];
}

export async function getClientSchedule(clientId: string) {
  return await db.select().from(clientSchedules).where(eq(clientSchedules.clientId, clientId));
}

export async function getAllClientSchedules() {
  return await db.select().from(clientSchedules).orderBy(clientSchedules.clientId, clientSchedules.diaSemana);
}
