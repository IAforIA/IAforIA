/**
 * COMPONENTE: ChatWidgetSimple
 * PROPÓSITO: Chat simplificado para Cliente/Motoboy com tags [Pedido #XXX]
 * BASEADO EM: prototipos/chat-cliente-com-tags.html e chat-motoboy-com-tags.html
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Paperclip, Mic, Send, Play } from "lucide-react";
import type { ChatMessage } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface ChatWidgetSimpleProps {
  embedded?: boolean; // Se true, renderiza inline sem botão flutuante
}

export function ChatWidgetSimple({ embedded = false }: ChatWidgetSimpleProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(embedded);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Busca mensagens
  const { data: messages = [], refetch } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat'],
    enabled: isOpen,
    refetchInterval: isOpen ? 3000 : false,
  });

  // Envia mensagem
  const sendMutation = useMutation({
    mutationFn: async (data: { message: string; orderId?: string; audioUrl?: string; imageUrl?: string }) => {
      const res = await apiRequest('POST', '/api/chat', {
        senderId: user?.id,
        receiverId: 'central-id', // TODO: pegar ID real da central
        message: data.message,
        orderId: data.orderId || null,
        audioUrl: data.audioUrl || null,
        imageUrl: data.imageUrl || null,
      });
      return await res.json();
    },
    onSuccess: () => {
      setMessageText('');
      refetch();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao enviar mensagem",
        description: error.message,
      });
    },
  });

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMutation.mutate({ message: messageText });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Cor do header baseado no role
  const headerColor = user?.role === 'client' ? 'bg-green-500' : 'bg-orange-500';

  if (!embedded && !isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <div className={embedded ? "h-full flex flex-col" : "fixed bottom-6 right-6 w-96 h-[600px] bg-background rounded-lg shadow-2xl flex flex-col"}>
      {/* HEADER */}
      <div className={`p-4 ${headerColor} text-white flex items-center justify-between rounded-t-lg`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white text-green-500 flex items-center justify-center font-bold">
            GE
          </div>
          <div>
            <h3 className="font-semibold">Guriri Express (Central)</h3>
            <div className="text-xs opacity-90">Online</div>
          </div>
        </div>
        {!embedded && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* AVISO INFORMATIVO */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-700 p-3 text-center text-xs text-yellow-800 dark:text-yellow-200">
        ℹ️ Mensagens com <Badge variant="secondary" className="bg-blue-500 text-white text-xs">📦 Pedido #XXX</Badge> são sobre pedidos.<br/>
        Sem tag = assuntos gerais.
      </div>

      {/* MENSAGENS */}
      <ScrollArea className="flex-1 p-4 bg-muted">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isSent = msg.senderId === user?.id;
            
            return (
              <div
                key={msg.id}
                className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${isSent ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`rounded-2xl px-3 py-2 shadow-sm ${
                    isSent ? 'bg-green-100 dark:bg-green-900/30' : 'bg-card'
                  }`}>
                    {/* TAG DE PEDIDO */}
                    {msg.orderId && (
                      <Badge className="bg-blue-500 text-white text-xs mb-2">
                        📦 Pedido #{msg.orderId.slice(0, 8)}
                      </Badge>
                    )}
                    
                    <div className="text-xs font-semibold mb-1 text-green-600">
                      {isSent ? 'Você' : 'Central'}
                    </div>
                    
                    {/* ÁUDIO */}
                    {msg.audioUrl && (
                      <div className="flex items-center gap-2 mb-2">
                        <Button size="sm" variant="ghost" className="w-8 h-8 rounded-full p-0">
                          <Play className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 h-6 bg-green-500/20 rounded-full"></div>
                        <span className="text-xs">2:34</span>
                      </div>
                    )}
                    
                    {/* IMAGEM */}
                    {msg.imageUrl && (
                      <img 
                        src={msg.imageUrl} 
                        alt="Imagem" 
                        className="max-w-full rounded-lg mb-2"
                      />
                    )}
                    
                    {/* TEXTO */}
                    {msg.message && (
                      <div className="text-sm leading-relaxed">{msg.message}</div>
                    )}
                    
                    <div className="text-xs text-muted-foreground text-right mt-1">
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
      <div className="p-4 bg-background border-t">
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
            placeholder="Digite uma mensagem..."
            className="flex-1 rounded-3xl"
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            className={`rounded-full ${headerColor}`}
            disabled={sendMutation.isPending}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
