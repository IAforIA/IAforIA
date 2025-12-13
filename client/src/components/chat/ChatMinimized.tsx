/**
 * ChatMinimized - Widget minimizado
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Package } from "lucide-react";
import type { ChatCategory } from "./types";

interface ChatMinimizedProps {
  selectedCategory: ChatCategory | null;
  unreadCount: number;
  isCentral: boolean;
  onExpand: () => void;
  onClose: () => void;
}

export function ChatMinimized({
  selectedCategory,
  unreadCount,
  isCentral,
  onExpand,
  onClose,
}: ChatMinimizedProps) {
  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-card border rounded-lg shadow-lg max-w-[calc(100vw-2rem)] sm:max-w-none">
      <div className="flex items-center justify-between p-2.5 sm:p-3 border-b">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="font-medium text-xs sm:text-sm truncate">Chat</span>
          {selectedCategory && (
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {selectedCategory === 'status_entrega' && '🚚'}
              {selectedCategory === 'suporte' && '💬'}
              {selectedCategory === 'problema' && '⚠️'}
            </Badge>
          )}
          {!isCentral && unreadCount > 0 && (
            <Badge variant="default" className="text-[11px] ml-1">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex gap-0.5 sm:gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onExpand}
          >
            <Package className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
