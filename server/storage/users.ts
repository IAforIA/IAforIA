import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from './db.js';
import { DOCUMENT_IN_USE_ERROR, EMAIL_IN_USE_ERROR, mapClientToProfile } from './utils.js';
import { clientSchedules, clients, users } from '@shared/schema';
import type { ClientOnboardingPayload, ClientProfileDto } from '@shared/contracts';

export async function getUser(id: string) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  return await db.select().from(users);
}

export async function createClientWithUser(
  payload: Omit<ClientOnboardingPayload, 'password'>,
  passwordHash: string
): Promise<ClientProfileDto> {
  const clientId = randomUUID();
  const normalizedDocument = payload.documentNumber.replace(/\D/g, '');

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, payload.email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error(EMAIL_IN_USE_ERROR);
  }

  const existingDocument = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.documentNumber, normalizedDocument))
    .limit(1);

  if (existingDocument.length > 0) {
    throw new Error(DOCUMENT_IN_USE_ERROR);
  }

  await db.insert(users).values({
    id: clientId,
    name: payload.name,
    role: 'client',
    email: payload.email,
    phone: payload.phone,
    password: passwordHash,
    status: 'active',
  });

  try {
    const insertedClient = await db
      .insert(clients)
      .values({
        id: clientId,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        company: payload.name,
        documentType: payload.documentType,
        documentNumber: normalizedDocument,
        ie: payload.documentType === 'PJ' ? payload.ie ?? null : null,
        cep: payload.address.cep,
        rua: payload.address.rua,
        numero: payload.address.numero,
        bairro: payload.address.bairro,
        complemento: payload.address.complemento ?? null,
        referencia: payload.address.referencia ?? null,
        geoLat: payload.address.geoLat !== undefined ? String(payload.address.geoLat) : null,
        geoLng: payload.address.geoLng !== undefined ? String(payload.address.geoLng) : null,
      })
      .returning();

    const profile = mapClientToProfile(insertedClient[0]);
    const schedule = await db
      .select()
      .from(clientSchedules)
      .where(eq(clientSchedules.clientId, clientId))
      .limit(1);

    if (schedule.length > 0) {
      profile.horario = {
        horaAbertura: schedule[0].horaAbertura ?? undefined,
        horaFechamento: schedule[0].horaFechamento ?? undefined,
        fechado: schedule[0].fechado ?? undefined,
      };
    }

    return profile;
  } catch (error) {
    await db.delete(users).where(eq(users.id, clientId));
    throw error;
  }
}

export async function getClientProfile(id: string): Promise<ClientProfileDto | null> {
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);

  if (result.length === 0) {
    return null;
  }

  const profile = mapClientToProfile(result[0]);
  const schedule = await db
    .select()
    .from(clientSchedules)
    .where(eq(clientSchedules.clientId, id))
    .limit(1);

  if (schedule.length > 0) {
    profile.horario = {
      horaAbertura: schedule[0].horaAbertura ?? undefined,
      horaFechamento: schedule[0].horaFechamento ?? undefined,
      fechado: schedule[0].fechado ?? undefined,
    };
  }

  return profile;
}
