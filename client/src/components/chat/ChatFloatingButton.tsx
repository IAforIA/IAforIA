/**
 * ChatFloatingButton - Botão flutuante para abrir o chat
 */

import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";

interface ChatFloatingButtonProps {
  unreadCount: number;
  onClick: () => void;
}

export function ChatFloatingButton({ unreadCount, onClick }: ChatFloatingButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-1.5 sm:gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 py-2.5 sm:px-6 sm:py-3 shadow-lg transition-all hover:scale-105"
    >
      <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
      <span className="font-medium text-sm sm:text-base">Chat</span>
      {unreadCount > 0 && (
        <Badge variant="secondary" className="ml-1 text-[11px]">{unreadCount}</Badge>
      )}
    </button>
  );
}
