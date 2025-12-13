// Shared helper utilities for normalizing chat message payloads across client and server

/**
 * Type representing any message-like object (DB row, API payload, WebSocket payload).
 * Supports both legacy (fromId/toId) and canonical (senderId/receiverId) field names.
 */
export interface MessageLike {
  id?: string;
  senderId?: string;
  fromId?: string;
  receiverId?: string | null;
  toId?: string | null;
  senderName?: string | null;
  fromName?: string | null;
  senderRole?: string | null;
  fromRole?: string | null;
  receiverRole?: string | null;
  toRole?: string | null;
  message?: string;
  category?: string;
  threadId?: string | null;
  orderId?: string | null;
  createdAt?: string | Date;
  [key: string]: unknown; // Allow additional DB fields
}

export function getSenderId(m: MessageLike | null | undefined): string | undefined {
  return m?.senderId ?? m?.fromId;
}

export function getReceiverId(m: MessageLike | null | undefined): string | undefined | null {
  // receiver can be null (public message)
  return m?.receiverId ?? m?.toId ?? null;
}

export function getSenderName(m: MessageLike | null | undefined): string | null {
  return m?.senderName ?? m?.fromName ?? null;
}

export function getSenderRole(m: MessageLike | null | undefined): string | null {
  return m?.senderRole ?? m?.fromRole ?? null;
}

export function isPublicMessage(m: MessageLike | null | undefined): boolean {
  return !getReceiverId(m);
}

export function toClientMessageFromDb(m: MessageLike): MessageLike & { fromId?: string; toId?: string | null; fromName?: string | null; fromRole?: string | null; toRole?: string | null } {
  // convert a DB row into the UI-friendly legacy object shape used by the front-end
  return {
    ...m,
    fromId: m.senderId ?? m.fromId,
    toId: m.receiverId ?? m.toId,
    fromName: m.senderName ?? m.fromName ?? null,
    fromRole: m.senderRole ?? m.fromRole ?? null,
    toRole: m.receiverRole ?? m.toRole ?? null,
  };
}

export function normalizeIncomingChatPayload(message: MessageLike): MessageLike {
  // Ensure canonical fields are present for storage
  const senderId = getSenderId(message);
  const receiverId = getReceiverId(message);
  const senderName = getSenderName(message);
  const senderRole = getSenderRole(message);

  return {
    ...message,
    senderId,
    receiverId,
    senderName,
    senderRole,
  };
}
