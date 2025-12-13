/**
 * ChatMessageList - Lista de mensagens do chat
 */

import { RefObject } from "react";
import { ChatMessage } from "../ChatMessage";
import type { ChatCategory, ChatWidgetProps, ChatMessageExtended } from "./types";

interface ChatMessageListProps {
  messages: ChatMessageExtended[];
  currentUserId: string;
  currentUserRole: ChatWidgetProps['currentUserRole'];
  isCentral: boolean;
  onAISuggestion?: (userMessage: string, category: ChatCategory, userId: string) => void;
  loadingAISuggestion: boolean;
  messagesScrollRef: RefObject<HTMLDivElement>;
  messagesEndRef: RefObject<HTMLDivElement>;
}

export function ChatMessageList({
  messages,
  currentUserId,
  currentUserRole,
  isCentral,
  onAISuggestion,
  loadingAISuggestion,
  messagesScrollRef,
  messagesEndRef,
}: ChatMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={messagesScrollRef}>
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground text-center">
            {currentUserRole === 'central' 
              ? 'Nenhuma mensagem ainda. Aguardando contatos...' 
              : 'Nenhuma mensagem. Inicie a conversa!'}
          </p>
        </div>
      ) : (
        messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onAISuggestion={isCentral ? onAISuggestion : undefined}
            loadingAISuggestion={loadingAISuggestion}
          />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
