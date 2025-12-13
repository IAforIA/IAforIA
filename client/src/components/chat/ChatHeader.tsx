/**
 * ChatHeader - Header do widget de chat
 */

import { Button } from "@/components/ui/button";
import { MessageCircle, X, Minus, ArrowLeft } from "lucide-react";
import type { ChatCategory } from "./types";

interface ChatHeaderProps {
  isCentral: boolean;
  showThreadList: boolean;
  currentThreadId: string | null;
  selectedCategory: ChatCategory | null;
  embedded: boolean;
  onBack: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export function ChatHeader({
  isCentral,
  showThreadList,
  currentThreadId,
  selectedCategory,
  embedded,
  onBack,
  onMinimize,
  onClose,
}: ChatHeaderProps) {
  const getTitle = () => {
    if (isCentral && showThreadList) return 'Conversas Ativas';
    if (isCentral && !showThreadList && currentThreadId) return 'Chat';
    if (!isCentral && !selectedCategory) return 'Escolha o Assunto';
    if (selectedCategory === 'status_entrega') return '🚚 Status de Entrega';
    if (selectedCategory === 'suporte') return '💬 Suporte';
    if (selectedCategory === 'problema') return '⚠️ Reportar Problema';
    return 'Chat';
  };

  const showBackButton = currentThreadId || selectedCategory;

  return (
    <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
      <div className="flex items-center gap-2">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground hover:bg-primary/80"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <MessageCircle className="h-5 w-5" />
        <span className="font-semibold">{getTitle()}</span>
      </div>
      {!embedded && (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground hover:bg-primary/80"
            onClick={onMinimize}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground hover:bg-primary/80"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
