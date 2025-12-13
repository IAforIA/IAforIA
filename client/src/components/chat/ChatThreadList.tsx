/**
 * ChatThreadList - Lista de threads de conversa (Central)
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { ThreadInfo } from "./types";

interface ChatThreadListProps {
  threads: ThreadInfo[];
  onSelectThread: (threadId: string) => void;
  onNewConversation: () => void;
}

export function ChatThreadList({ threads, onSelectThread, onNewConversation }: ChatThreadListProps) {
  const getCategoryIcon = (category: string) => {
    if (category === 'status_entrega') return '🚚';
    if (category === 'suporte') return '💬';
    if (category === 'problema') return '⚠️';
    return '💬';
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header com botão Nova Conversa */}
      <div className="p-3 border-b flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {threads.length} conversa{threads.length !== 1 ? 's' : ''}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNewConversation}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Nova Conversa
        </Button>
      </div>

      {threads.length === 0 ? (
        <div className="flex items-center justify-center h-[calc(100%-60px)] p-6">
          <p className="text-sm text-muted-foreground text-center">
            Nenhuma conversa ainda. Clique em "Nova Conversa" para iniciar ou aguarde mensagens de clientes e motoboys...
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {threads.map((thread) => (
            <button
              key={thread.threadId}
              onClick={() => onSelectThread(thread.threadId)}
              className="w-full p-4 hover:bg-accent text-left transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm truncate">
                      {thread.participantName}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {getCategoryIcon(thread.category)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {thread.lastMessage.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(thread.lastMessage.createdAt).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {thread.unreadCount > 0 && (
                  <Badge variant="default" className="shrink-0">
                    {thread.unreadCount}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
