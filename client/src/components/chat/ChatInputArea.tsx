/**
 * ChatInputArea - Área de input de mensagens
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatInputAreaProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  isPending: boolean;
  disabled: boolean;
}

export function ChatInputArea({
  message,
  onMessageChange,
  onSend,
  isPending,
  disabled,
}: ChatInputAreaProps) {
  return (
    <div className="border-t p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="flex gap-2"
      >
        <Input
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-1"
          disabled={isPending}
        />
        <Button 
          type="submit" 
          size="icon"
          disabled={disabled || isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
      <p className="text-xs text-muted-foreground mt-2">
        Suas mensagens são enviadas para a Central
      </p>
    </div>
  );
}
