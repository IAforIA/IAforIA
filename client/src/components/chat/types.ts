/**
 * Chat Module - Shared Types
 */

import type { ChatMessage as BaseChatMessageType } from "@shared/schema";

export type ChatCategory = 'status_entrega' | 'suporte' | 'problema';

// Tipo estendido com campos que existem no runtime mas não no schema TS
export interface ChatMessageExtended extends BaseChatMessageType {
  threadId: string;
  category: string;
  senderName?: string;
  senderRole?: string;
  toRole?: string;
}

export interface ChatWidgetProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'client' | 'motoboy' | 'central';
  embedded?: boolean;
}

export interface ThreadInfo {
  threadId: string;
  lastMessage: ChatMessageExtended;
  unreadCount: number;
  participantName: string;
  participantRole: string;
  category: string;
  messageCount: number;
}
