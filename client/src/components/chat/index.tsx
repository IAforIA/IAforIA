/**
 * ChatWidget - Widget de Chat Flutuante (Refatorado)
 * 
 * ARQUITETURA DE COMUNICAÇÃO:
 * - Cliente → Central (nunca direto com motoboy)
 * - Motoboy → Central (nunca direto com cliente)
 * - Central → Cliente/Motoboy (IA futura intermediando)
 * 
 * CATEGORIAS:
 * 🚚 Status de Entrega - Cliente pergunta sobre pedido
 * 💬 Falar com Central - Suporte geral
 * ⚠️ Reportar Problema - Urgências
 */

import { useChat } from "./useChat";
import { ChatHeader } from "./ChatHeader";
import { ChatThreadList } from "./ChatThreadList";
import { ChatCategorySelector } from "./ChatCategorySelector";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInputArea } from "./ChatInputArea";
import { ChatFloatingButton } from "./ChatFloatingButton";
import { ChatMinimized } from "./ChatMinimized";
import { NewConversationDialog } from "../NewConversationDialog";
import type { ChatWidgetProps } from "./types";

export function ChatWidget(props: ChatWidgetProps) {
  const { currentUserId, currentUserRole } = props;
  const chat = useChat(props);

  // Botão flutuante quando fechado (não se aplica a embedded)
  if (!chat.isOpen && !chat.embedded) {
    return (
      <ChatFloatingButton
        unreadCount={chat.unreadCount}
        onClick={() => chat.setIsOpen(true)}
      />
    );
  }

  // Widget minimizado (não se aplica a embedded)
  if (chat.isMinimized && !chat.embedded) {
    return (
      <ChatMinimized
        selectedCategory={chat.selectedCategory}
        unreadCount={chat.unreadCount}
        isCentral={chat.isCentral}
        onExpand={() => chat.setIsMinimized(false)}
        onClose={() => chat.setIsOpen(false)}
      />
    );
  }

  // Classes do container
  const containerClasses = chat.embedded
    ? "w-full h-full bg-card border rounded-lg shadow-sm flex flex-col"
    : "fixed inset-4 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-96 sm:h-[500px] md:w-[420px] md:h-[550px] bg-card border rounded-lg shadow-2xl flex flex-col";

  // Determina qual conteúdo mostrar
  const showCategorySelector = !chat.selectedCategory && currentUserRole !== 'central';
  const showMessages = !chat.showThreadList && (chat.selectedCategory || (chat.isCentral && chat.currentThreadId));

  return (
    <div className={containerClasses}>
      <ChatHeader
        isCentral={chat.isCentral}
        showThreadList={chat.showThreadList}
        currentThreadId={chat.currentThreadId}
        selectedCategory={chat.selectedCategory}
        embedded={chat.embedded}
        onBack={chat.handleBackToMenu}
        onMinimize={() => chat.setIsMinimized(true)}
        onClose={() => chat.setIsOpen(false)}
      />

      {/* Lista de Threads (Central) */}
      {chat.isCentral && chat.showThreadList && (
        <ChatThreadList
          threads={chat.threads}
          onSelectThread={chat.handleSelectThread}
          onNewConversation={() => chat.setShowNewConversationDialog(true)}
        />
      )}

      {/* Menu de Seleção de Categoria (Cliente/Motoboy) */}
      {showCategorySelector && (
        <ChatCategorySelector onSelectCategory={chat.handleCategorySelect} />
      )}

      {/* Lista de Mensagens e Input */}
      {showMessages && (
        <>
          <ChatMessageList
            messages={chat.currentMessages}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            isCentral={chat.isCentral}
            onAISuggestion={chat.handleAISuggestion}
            loadingAISuggestion={chat.loadingAISuggestion}
            messagesScrollRef={chat.messagesScrollRef}
            messagesEndRef={chat.messagesEndRef}
          />
          <ChatInputArea
            message={chat.message}
            onMessageChange={chat.setMessage}
            onSend={chat.handleSend}
            isPending={chat.sendMutation.isPending}
            disabled={!chat.message.trim()}
          />
        </>
      )}

      {/* Dialog para Nova Conversa (Central) */}
      {chat.isCentral && (
        <NewConversationDialog
          open={chat.showNewConversationDialog}
          onOpenChange={chat.setShowNewConversationDialog}
          onStartConversation={(recipient) => 
            chat.handleStartNewConversation(recipient.id, recipient.name, recipient.role)
          }
        />
      )}
    </div>
  );
}

// Re-exports
export { ChatHeader } from "./ChatHeader";
export { ChatThreadList } from "./ChatThreadList";
export { ChatCategorySelector } from "./ChatCategorySelector";
export { ChatMessageList } from "./ChatMessageList";
export { ChatInputArea } from "./ChatInputArea";
export { ChatFloatingButton } from "./ChatFloatingButton";
export { ChatMinimized } from "./ChatMinimized";
export { useChat } from "./useChat";
export type { ChatCategory, ChatWidgetProps, ThreadInfo } from "./types";
