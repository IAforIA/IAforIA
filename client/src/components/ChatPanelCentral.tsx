/**
 * COMPONENTE: ChatPanelCentral
 * PROPÓSITO: Painel de chat da Central com abas para pedidos ou direto para conversas gerais
 * BASEADO EM: prototipos/chat-central-com-geral.html
 */

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Mic, Send, Play } from "lucide-react";
import type { ChatMessage, Order } from "@shared/schema";
import type { ChatConversation } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatPanelCentralProps {
  conversation: ChatConversation | null;
  order: Order | null;
  messages: ChatMessage[];
  onSendMessage: (message: string, audioUrl?: string, imageUrl?: string) => void;
}

export function ChatPanelCentral({
  conversation,
  order,
  messages,
  onSendMessage,
}: ChatPanelCentralProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messageText, setMessageText] = useState('');
  const [activeTab, setActiveTab] = useState<'motoboy' | 'client'>('motoboy');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim()) return;
    onSendMessage(messageText);
    setMessageText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Se não há conversa selecionada
  if (!conversation && !order) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
            💬
          </div>
          <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
          <p className="text-sm">Escolha um pedido ou conversa geral para começar</p>
        </div>
      </div>
    );
  }

  const isGeneralConversation = conversation && !conversation.orderId;

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className={`p-5 text-white ${isGeneralConversation ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-purple-600 to-purple-800'}`}>
        <div className="font-semibold text-lg">
          {isGeneralConversation ? '💬 Conversa Geral' : `Pedido #${order?.id.slice(0, 8)}`}
        </div>
        <div className="text-sm opacity-90">
          {isGeneralConversation 
            ? `Com: ${conversation.userName}`
            : `Entre: ${order?.motoboyName || 'Motoboy'} ↔ Central ↔ ${order?.clientName || 'Cliente'}`
          }
        </div>
      </div>

      {/* AVISO PARA CONVERSA GERAL */}
      {isGeneralConversation && (
        <div className="bg-yellow-50 border-b-2 border-yellow-200 p-3 text-center text-sm text-yellow-800">
          ℹ️ Conversa geral (sem pedido específico) - Não há abas aqui
        </div>
      )}

      {/* ABAS (somente para pedidos) */}
      {!isGeneralConversation && order && (
        <div className="flex bg-gray-100 border-b-2 border-gray-200">
          <button
            className={`flex-1 py-3 text-sm font-medium border-b-3 ${
              activeTab === 'motoboy'
                ? 'text-purple-600 border-purple-600 bg-white'
                : 'text-gray-500 border-transparent bg-transparent'
            }`}
            onClick={() => setActiveTab('motoboy')}
          >
            💬 {order.motoboyName || 'Motoboy'}
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium border-b-3 ${
              activeTab === 'client'
                ? 'text-purple-600 border-purple-600 bg-white'
                : 'text-gray-500 border-transparent bg-transparent'
            }`}
            onClick={() => setActiveTab('client')}
          >
            👤 {order.clientName}
          </button>
        </div>
      )}

      {/* MENSAGENS */}
      <ScrollArea className="flex-1 p-5 bg-gray-50">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isSent = msg.senderId === user?.id;
            
            return (
              <div
                key={msg.id}
                className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isSent ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className="text-xs font-semibold text-purple-600 px-3">
                    {isSent ? 'Você (Central)' : (conversation?.userName || 'Usuário')}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                    isSent ? 'bg-purple-600 text-white' : 'bg-white text-gray-900'
                  }`}>
                    {msg.audioUrl && (
                      <div className="flex items-center gap-3 mb-2">
                        <Button size="sm" variant="ghost" className="w-9 h-9 rounded-full p-0">
                          <Play className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 h-8 bg-purple-500/20 rounded-full"></div>
                        <span className="text-xs">2:34</span>
                      </div>
                    )}
                    {msg.imageUrl && (
                      <img 
                        src={msg.imageUrl} 
                        alt="Imagem" 
                        className="max-w-xs rounded-lg mb-2"
                      />
                    )}
                    {msg.message && (
                      <div className="text-sm leading-relaxed">{msg.message}</div>
                    )}
                    <div className={`text-xs mt-2 ${isSent ? 'text-white/70' : 'text-gray-500'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* INPUT */}
      <div className="p-5 bg-white border-t">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="rounded-full">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Button size="icon" variant="ghost" className="rounded-full">
            <Mic className="w-5 h-5" />
          </Button>
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isGeneralConversation
                ? `Conversa geral com ${conversation.userName} (sem pedido)...`
                : `Responder para ${activeTab === 'motoboy' ? order?.motoboyName : order?.clientName}...`
            }
            className="flex-1 rounded-3xl border-2 border-gray-200"
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            className="rounded-full bg-gradient-to-br from-purple-600 to-purple-800"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
