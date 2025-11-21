import { ChatMessage as ChatMessageType } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

type ChatCategory = 'status_entrega' | 'suporte' | 'problema';

interface ChatMessageProps {
  message: ChatMessageType;
  currentUserId: string;
  currentUserRole?: 'client' | 'motoboy' | 'central';
  onAISuggestion?: (message: string, category: ChatCategory, userId: string) => void;
  loadingAISuggestion?: boolean;
}

export function ChatMessage({ 
  message, 
  currentUserId, 
  currentUserRole,
  onAISuggestion,
  loadingAISuggestion 
}: ChatMessageProps) {
  const isOwnMessage = message.fromId === currentUserId;
  const isPublic = !message.toId;
  const isCentral = currentUserRole === 'central';
  const canSuggestAI = isCentral && !message.isFromCentral && !isOwnMessage;

  // Role badge colors
  const roleColors = {
    central: "bg-purple-100 text-purple-800",
    motoboy: "bg-blue-100 text-blue-800",
    client: "bg-green-100 text-green-800",
  };

  const roleLabels = {
    central: "Central",
    motoboy: "Motoboy",
    client: "Cliente",
  };

  return (
    <div
      className={cn(
        "flex flex-col mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isOwnMessage ? "items-end" : "items-start"
      )}
    >
      {/* Sender info */}
      <div className="flex items-center gap-2 mb-1 px-1">
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full font-medium",
          roleColors[message.fromRole as keyof typeof roleColors] || "bg-gray-100 text-gray-800"
        )}>
          {roleLabels[message.fromRole as keyof typeof roleLabels] || message.fromRole}
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          {message.fromName}
        </span>
        {isPublic && (
          <span className="text-xs text-muted-foreground italic">
            (público)
          </span>
        )}
      </div>

      {/* Message bubble */}
      <div className="flex flex-col gap-2 max-w-[80%]">
        <div
          className={cn(
            "rounded-lg px-4 py-2 shadow-sm",
            isOwnMessage
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.message}
          </p>
          
          {/* Timestamp */}
          <p className={cn(
            "text-xs mt-1",
            isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {new Date(message.createdAt).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>

        {/* Botão de Sugestão IA (apenas para Central) */}
        {canSuggestAI && onAISuggestion && (
          <Button
            variant="outline"
            size="sm"
            className="self-start gap-2"
            onClick={() => onAISuggestion(message.message, message.category as ChatCategory, message.fromId)}
            disabled={loadingAISuggestion}
          >
            <Sparkles className="h-3 w-3" />
            {loadingAISuggestion ? 'Gerando...' : 'Sugerir Resposta com IA'}
          </Button>
        )}
      </div>
    </div>
  );
}
