import { describe, it, expect } from 'vitest';
import { getSenderId, getReceiverId, getSenderName, getSenderRole, toClientMessageFromDb, normalizeIncomingChatPayload } from '@shared/message-utils';

describe('message-utils', () => {
  it('normalizes legacy fromId/toId to senderId/receiverId', () => {
    const legacy = { fromId: 'user-123', toId: null, fromName: 'João', fromRole: 'client' };
    const normalized = normalizeIncomingChatPayload(legacy as any);
    expect(normalized.senderId).toBe('user-123');
    expect(normalized.receiverId).toBeNull();
    expect(normalized.senderName).toBe('João');
    expect(normalized.senderRole).toBe('client');
  });

  it('uses canonical fields when provided', () => {
    const canonical = { senderId: 'user-abc', receiverId: 'central' } as any;
    expect(getSenderId(canonical)).toBe('user-abc');
    expect(getReceiverId(canonical)).toBe('central');
  });

  it('toClientMessageFromDb maps canonical fields to legacy shapes', () => {
    const dbRow = { id: 'm1', senderId: 's1', receiverId: 'r1', senderName: 'Alice', senderRole: 'motoboy', createdAt: new Date() } as any;
    const ui = toClientMessageFromDb(dbRow);
    expect(ui.fromId).toBe('s1');
    expect(ui.toId).toBe('r1');
    expect(ui.fromName).toBe('Alice');
    expect(ui.fromRole).toBe('motoboy');
  });
});
