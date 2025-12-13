/**
 * ChatCategorySelector - Menu de seleção de categoria (Cliente/Motoboy)
 */

import { Package, MessageSquare, AlertTriangle } from "lucide-react";
import type { ChatCategory } from "./types";

interface ChatCategorySelectorProps {
  onSelectCategory: (category: ChatCategory) => void;
}

export function ChatCategorySelector({ onSelectCategory }: ChatCategorySelectorProps) {
  return (
    <div className="flex-1 p-6 space-y-4">
      <p className="text-sm text-muted-foreground mb-6">
        Selecione o tipo de conversa que deseja iniciar:
      </p>

      <button
        onClick={() => onSelectCategory('status_entrega')}
        className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all text-left group"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:scale-110 transition-transform">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">🚚 Status de Entrega</h3>
            <p className="text-sm text-muted-foreground">
              Perguntar sobre um pedido em andamento
            </p>
          </div>
        </div>
      </button>

      <button
        onClick={() => onSelectCategory('suporte')}
        className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all text-left group"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg group-hover:scale-110 transition-transform">
            <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">💬 Falar com Central</h3>
            <p className="text-sm text-muted-foreground">
              Dúvidas gerais, suporte ou informações
            </p>
          </div>
        </div>
      </button>

      <button
        onClick={() => onSelectCategory('problema')}
        className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all text-left group"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg group-hover:scale-110 transition-transform">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">⚠️ Reportar Problema</h3>
            <p className="text-sm text-muted-foreground">
              Urgências, problemas ou reclamações
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
