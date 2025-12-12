import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from './db.js';
import { DOCUMENT_IN_USE_ERROR, EMAIL_IN_USE_ERROR, mapClientToProfile } from './utils.js';
import { clientSchedules, clients, users, motoboys, motoboySchedules } from '@shared/schema';
import type { ClientOnboardingPayload, ClientProfileDto, MotoboyOnboardingPayload } from '@shared/contracts';

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

// CPF_IN_USE constant
const CPF_IN_USE_ERROR = "CPF_IN_USE";

/**
 * FUNÇÃO: createMotoboyWithUser
 * PROPÓSITO: Criar novo motoboy com user associado
 * RETORNO: Objeto com dados do motoboy criado
 */
export async function createMotoboyWithUser(
  payload: Omit<MotoboyOnboardingPayload, 'password' | 'acceptTerms'>,
  passwordHash: string
): Promise<{ id: string; name: string; phone: string; email: string; cpf: string; placa: string | null }> {
  const motoboyId = `moto-${randomUUID().split('-')[0]}`;
  const normalizedCpf = payload.cpf.replace(/\D/g, '');

  // Verificar se email já existe
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, payload.email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error(EMAIL_IN_USE_ERROR);
  }

  // Verificar se CPF já existe
  const existingCpf = await db
    .select({ id: motoboys.id })
    .from(motoboys)
    .where(eq(motoboys.cpf, normalizedCpf))
    .limit(1);

  if (existingCpf.length > 0) {
    throw new Error(CPF_IN_USE_ERROR);
  }

  // Criar usuário
  await db.insert(users).values({
    id: motoboyId,
    name: payload.name,
    role: 'motoboy',
    email: payload.email,
    phone: payload.phone,
    password: passwordHash,
    status: 'active',
  });

  try {
    // Criar motoboy
    const insertedMotoboy = await db
      .insert(motoboys)
      .values({
        id: motoboyId,
        name: payload.name,
        phone: payload.phone,
        cpf: normalizedCpf,
        placa: payload.placa ?? null,
        pix: payload.pix ?? null,
        taxaPadrao: '7.00',
        status: 'ativo',
        online: false,
      })
      .returning();

    // Criar schedules padrão (todos os turnos habilitados para todos os dias)
    for (let diaSemana = 0; diaSemana <= 6; diaSemana++) {
      await db.insert(motoboySchedules).values({
        motoboyId: motoboyId,
        diaSemana: diaSemana,
        turnoManha: true,
        turnoTarde: true,
        turnoNoite: true,
      });
    }

    return {
      id: insertedMotoboy[0].id,
      name: insertedMotoboy[0].name,
      phone: insertedMotoboy[0].phone,
      email: payload.email,
      cpf: insertedMotoboy[0].cpf ?? '',
      placa: insertedMotoboy[0].placa,
    };
  } catch (error) {
    // Rollback: remover usuário se falhar criação do motoboy
    await db.delete(users).where(eq(users.id, motoboyId));
    throw error;
  }
}
