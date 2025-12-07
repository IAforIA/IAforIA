import type { ClientProfileDto, DocumentType } from '@shared/contracts';
import { toClientMessageFromDb } from '@shared/message-utils';
import { users, type Client } from '@shared/schema';

export const EMAIL_IN_USE_ERROR = 'EMAIL_IN_USE';
export const DOCUMENT_IN_USE_ERROR = 'DOCUMENT_IN_USE';

export function mapClientToProfile(client: Client): ClientProfileDto {
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email ?? '',
    documentType: client.documentType as DocumentType,
    documentNumber: client.documentNumber,
    ie: client.ie,
    mensalidade: client.mensalidade ? Number(client.mensalidade) : 0,
    address: {
      cep: client.cep,
      rua: client.rua,
      numero: client.numero,
      bairro: client.bairro,
      complemento: client.complemento,
      referencia: client.referencia,
      geoLat: client.geoLat ? Number(client.geoLat) : null,
      geoLng: client.geoLng ? Number(client.geoLng) : null,
    },
    horario: undefined,
  };
}

export function shapeChatMessage(
  row: any,
  usersMap: Record<string, typeof users.$inferSelect | undefined>
) {
  const base = toClientMessageFromDb(row);
  const senderId = base.senderId ?? base.fromId ?? null;
  const receiverId = base.receiverId ?? base.toId ?? null;

  const senderUser = senderId ? usersMap[senderId] : undefined;
  const receiverUser = receiverId ? usersMap[receiverId] : undefined;

  const senderName = base.senderName ?? base.fromName ?? senderUser?.name ?? null;
  const senderRole = base.senderRole ?? base.fromRole ?? senderUser?.role ?? null;
  const receiverRole = base.receiverRole ?? base.toRole ?? receiverUser?.role ?? null;
  const category = base.category ?? (row as any)?.category ?? ((row as any)?.orderId ? 'status_entrega' : 'suporte');
  // Align threadId to the participant (receiver when Central sends; sender otherwise)
  const threadParticipantId = senderRole === 'central' && receiverId ? receiverId : senderId;
  const threadId = base.threadId ?? (row as any)?.threadId ?? (threadParticipantId ? `${threadParticipantId}_${category}` : '');
  const toRole = base.toRole ?? receiverRole ?? null;

  return {
    ...base,
    senderId,
    receiverId,
    senderName,
    senderRole,
    receiverName: base.receiverName ?? receiverUser?.name ?? null,
    receiverRole,
    category,
    threadId,
    toRole,
    fromId: senderId,
    toId: receiverId,
    fromName: senderName,
    fromRole: senderRole,
  };
}
