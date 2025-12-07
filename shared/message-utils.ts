// Shared helper utilities for normalizing chat message payloads across client and server
export function getSenderId(m: any): string | undefined {
  return m?.senderId ?? m?.fromId;
}

export function getReceiverId(m: any): string | undefined | null {
  // receiver can be null (public message)
  return m?.receiverId ?? m?.toId ?? null;
}

export function getSenderName(m: any): string | null {
  return m?.senderName ?? m?.fromName ?? null;
}

export function getSenderRole(m: any): string | null {
  return m?.senderRole ?? m?.fromRole ?? null;
}

export function isPublicMessage(m: any): boolean {
  return !getReceiverId(m);
}

export function toClientMessageFromDb(m: any) {
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

export function normalizeIncomingChatPayload(message: any) {
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
