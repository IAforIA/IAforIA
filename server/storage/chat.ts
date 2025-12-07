import { asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from './db.js';
import { chatMessages, users } from '@shared/schema';
import { normalizeIncomingChatPayload } from '@shared/message-utils';
import logger from '../logger.js';
import { shapeChatMessage } from './utils.js';

export async function getChatMessages(limit?: number) {
  // Ordena em ordem crescente para que a última mensagem fique no final da lista no front
  let query = db.select().from(chatMessages).orderBy(asc(chatMessages.createdAt));
  if (limit) query = query.limit(limit);
  const results = await query;

  const participantIds = new Set<string>();
  results.forEach((r) => {
    if (r.senderId) participantIds.add(r.senderId);
    if (r.receiverId) participantIds.add(r.receiverId);
  });

  const usersRows = participantIds.size > 0
    ? await db.select().from(users).where(inArray(users.id, Array.from(participantIds)))
    : [];
  const usersMap = Object.fromEntries(usersRows.map((u) => [u.id, u]));

  return results.map((row: any) => shapeChatMessage(row, usersMap));
}

export async function createChatMessage(message: any) {
  const normalized = normalizeIncomingChatPayload(message);
  if ((message as any).fromId && !(message as any).senderId) {
    logger.warn('legacy_chat_fields_used_storage', { fromId: (message as any).fromId });
  }

  const senderId = normalized.senderId;
  const receiverId = normalized.receiverId ?? null;

  const insertData = {
    senderId,
    receiverId,
    orderId: message.orderId ?? null,
    message: message.message ?? null,
    audioUrl: message.audioUrl ?? null,
    imageUrl: message.imageUrl ?? null,
  } as any;

  const result = await db.insert(chatMessages).values(insertData).returning();
  const inserted = result[0];

  const participantIds = [senderId, receiverId].filter(Boolean) as string[];
  const usersRows = participantIds.length > 0
    ? await db.select().from(users).where(inArray(users.id, participantIds))
    : [];
  const usersMap = Object.fromEntries(usersRows.map((u) => [u.id, u]));

  return shapeChatMessage(
    {
      ...inserted,
      ...normalized,
      toRole: message.toRole ?? message.receiverRole ?? null,
      threadId: message.threadId ?? null,
      category: message.category ?? null,
    },
    usersMap,
  );
}
