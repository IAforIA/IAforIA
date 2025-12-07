/**
 * ChatWidget - Widget de Chat Flutuante
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

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { resolveWebSocketUrl } from "@/lib/utils";
import { getSenderId, getReceiverId, getSenderName, getSenderRole, isPublicMessage } from '../../../shared/message-utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Minus, Send, Package, MessageSquare, AlertTriangle, ArrowLeft } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessage as ChatMessageType } from "@shared/schema";



type ChatCategory = 'status_entrega' | 'suporte' | 'problema';

interface ChatWidgetProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'client' | 'motoboy' | 'central';
  embedded?: boolean; // Se true, renderiza inline sem botão flutuante
}

export function ChatWidget({ currentUserId, currentUserName, currentUserRole, embedded = false }: ChatWidgetProps) {
  const isCentral = currentUserRole === 'central';
  const [isOpen, setIsOpen] = useState(embedded ? true : false); // Embedded sempre aberto
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ChatCategory | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [loadingAISuggestion, setLoadingAISuggestion] = useState(false);
  const [showThreadList, setShowThreadList] = useState(isCentral); // Central começa com lista de threads
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  // Para cliente/motoboy manter contagem de não lidas, buscamos mesmo fechado (flutuante).
  const shouldFetchMessages = isOpen || (!isCentral && !embedded);

  // Para cliente/motoboy, ao abrir o chat já seleciona automaticamente a categoria padrão (suporte)
  useEffect(() => {
    if (!isCentral && isOpen && !selectedCategory) {
      const defaultCategory: ChatCategory = 'suporte';
      setSelectedCategory(defaultCategory);
      setCurrentThreadId(`${currentUserId}_${defaultCategory}`);
    }
  }, [isCentral, isOpen, selectedCategory, currentUserId]);

  // Query: busca mensagens (backend já filtra por usuário automaticamente)
  // Se for Central E tiver threadId selecionado, filtra por thread específica
  // Senão, busca todas as mensagens que o usuário tem permissão de ver
  const { data: messages = [], refetch } = useQuery<ChatMessageType[]>({
    queryKey: (isCentral && currentThreadId)
      ? [`/api/chat?threadId=${currentThreadId}`]
      : ['/api/chat'],
    enabled: shouldFetchMessages,
    refetchInterval: shouldFetchMessages && !isMinimized ? (isOpen ? 3000 : 10000) : false,
  });

  // Zera contagem ao abrir
  useEffect(() => {
    if (isOpen) {
      setLastReadTimestamp(Date.now());
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Atualiza contagem de não lidas enquanto fechado
  useEffect(() => {
    if (isOpen || isCentral || isMinimized || embedded) return;
    const newUnread = messages.filter((m) => {
      const created = new Date(m.createdAt).getTime();
      return created > lastReadTimestamp && getSenderId(m as any) !== currentUserId;
    }).length;
    setUnreadCount(newUnread);
  }, [isOpen, isCentral, isMinimized, embedded, messages, lastReadTimestamp, currentUserId]);

  // Mutation: enviar mensagem
  const sendMutation = useMutation({
    mutationFn: async (messageData: {
      message: string;
      category: ChatCategory;
      orderId?: string;
      threadId?: string;
      receiverId?: string | null;
      toRole?: string | null;
      senderId: string;
      senderName: string;
      senderRole: ChatWidgetProps['currentUserRole'];
    }) => {
      const res = await apiRequest('POST', '/api/chat', messageData);
      return await res.json() as ChatMessageType;
    },
    onSuccess: () => {
      setMessage("");
      refetch();
    },
    onError: (error) => {
      console.error('Erro ao enviar mensagem:', error);
    },
  });

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (isMinimized) return;
    const el = messagesScrollRef.current;
    if (el) {
      // Scroll apenas no container do chat para não empurrar a página
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  // Refetch imediato ao abrir o chat ou trocar de thread/categoria
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, currentThreadId, selectedCategory, refetch]);

  // WebSocket listener para atualizações em tempo real
  const { token } = useAuth();

  useEffect(() => {
    if (!shouldFetchMessages) return;

    if (!token) return;
    const websocket = new WebSocket(resolveWebSocketUrl(token));

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          refetch(); // Atualiza mensagens quando nova chega
        }
      } catch (error) {
        console.error('Erro ao processar WebSocket:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      websocket.close();
    };
  }, [shouldFetchMessages, refetch]);

  const handleSend = () => {
    // Central pode enviar sem categoria, outros usuários precisam de categoria
    if (!message.trim()) return;
    if (!isCentral && !selectedCategory) return;

    // Para Central: usa categoria da thread ou 'suporte' como padrão
    const messageCategory = selectedCategory || 'suporte';
    
    // THREAD ID: Mantém a mesma thread para toda a conversa
    // Formato: userId_categoria (SEM timestamp para manter consistência)
    // Cliente/Motoboy sempre tem a mesma thread por categoria
    // Central usa a thread recebida do usuário
    const threadId = currentThreadId || `${currentUserId}_${messageCategory}`;
    
    // Central envia para usuário específico (baseado na thread), outros enviam para Central
    const toId = isCentral ? (currentThreadId ? currentThreadId.split('_')[0] : null) : null;
    // Detecta role do participante da thread selecionada
    const threadInfo = threads.find(t => t.threadId === currentThreadId);
    const toRole = isCentral ? (toId ? (threadInfo?.participantRole || 'client') : null) : 'central';
    
    sendMutation.mutate({
      message: message.trim(),
      category: messageCategory,
      threadId,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      receiverId: toId,
      toRole,
    } as any);

    // Define threadId atual para manter conversa
    if (!currentThreadId) {
      setCurrentThreadId(threadId);
    }

    // Ao enviar, consideramos mensagens lidas
    setLastReadTimestamp(Date.now());
    setUnreadCount(0);
  };

  const handleCategorySelect = (category: ChatCategory) => {
    setSelectedCategory(category);
    // Define o threadId baseado na categoria (mantém conversa consistente)
    const threadId = `${currentUserId}_${category}`;
    setCurrentThreadId(threadId);
  };

  const handleBackToMenu = () => {
    if (isCentral) {
      // Central volta para lista de threads
      setShowThreadList(true);
      setCurrentThreadId(null);
      setMessage("");
    } else {
      // Cliente/Motoboy volta para seleção de categoria
      setSelectedCategory(null);
      setCurrentThreadId(null);
      setMessage("");
    }
  };

  // Agrupa mensagens por thread (para Central)
  // Apenas mensagens RECEBIDAS (não enviadas pela Central)
  const threadGroups = isCentral ? messages.reduce((acc, msg) => {
    // Ignora mensagens enviadas pela própria Central
    if (getSenderId(msg) === currentUserId) {
      return acc;
    }
    if (!acc[msg.threadId]) {
      acc[msg.threadId] = [];
    }
    acc[msg.threadId].push(msg);
    return acc;
  }, {} as Record<string, ChatMessageType[]>) : {};

  const threads = Object.entries(threadGroups).map(([threadId, msgs]) => {
    const lastMessage = msgs[msgs.length - 1];
    const unreadCount = msgs.filter(m => getSenderRole(m as any) !== 'central' && getSenderId(m) !== currentUserId).length;
    const firstMessage = msgs.find(m => getSenderId(m) !== currentUserId);
    const participantName = firstMessage ? getSenderName(firstMessage as any) || 'Desconhecido' : 'Desconhecido';
    const participantRole = firstMessage ? getSenderRole(firstMessage as any) || 'client' : 'client';
    
    return {
      threadId,
      lastMessage,
      unreadCount,
      participantName,
      participantRole,
      category: lastMessage.category,
      messageCount: msgs.length
    };
  }).sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

  // Função para buscar sugestão da IA (apenas Central)
  const handleAISuggestion = async (userMessage: string, category: ChatCategory, userId: string) => {
    if (!isCentral) return;
    
    setLoadingAISuggestion(true);
    try {
      const response = await apiRequest('POST', '/api/chat/ai-suggest', {
        message: userMessage,
        category,
        userId
      });
      
      const data = await response.json();
      
      if (data.suggestion) {
        setMessage(data.suggestion); // Preenche campo de texto com sugestão
      }
    } catch (error: any) {
      console.error('Erro ao buscar sugestão:', error);
      alert(error.message || 'Erro ao buscar sugestão de IA');
    } finally {
      setLoadingAISuggestion(false);
    }
  };

  // Renderiza botão flutuante quando fechado (não se aplica a embedded)
  if (!isOpen && !embedded) {
    return (
      <button
        onClick={() => setIsOpen(true)}
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

  // Renderiza widget minimizado (não se aplica a embedded)
  if (isMinimized && !embedded) {
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
              onClick={() => setIsMinimized(false)}
            >
              <Package className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Renderiza widget aberto
  const containerClasses = embedded
    ? "w-full h-full bg-card border rounded-lg shadow-sm flex flex-col"
    : "fixed inset-4 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-96 sm:h-[500px] md:w-[420px] md:h-[550px] bg-card border rounded-lg shadow-2xl flex flex-col";

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          {(currentThreadId || selectedCategory) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary-foreground hover:bg-primary/80"
              onClick={handleBackToMenu}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <MessageCircle className="h-5 w-5" />
          <span className="font-semibold">
            {isCentral && showThreadList && 'Conversas Ativas'}
            {isCentral && !showThreadList && currentThreadId && 'Chat'}
            {!isCentral && !selectedCategory && 'Escolha o Assunto'}
            {selectedCategory === 'status_entrega' && '🚚 Status de Entrega'}
            {selectedCategory === 'suporte' && '💬 Suporte'}
            {selectedCategory === 'problema' && '⚠️ Reportar Problema'}
          </span>
        </div>
        {!embedded && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary-foreground hover:bg-primary/80"
              onClick={() => setIsMinimized(true)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary-foreground hover:bg-primary/80"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Lista de Threads (apenas Central) */}
      {isCentral && showThreadList && (
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="flex items-center justify-center h-full p-6">
              <p className="text-sm text-muted-foreground text-center">
                Nenhuma conversa ainda. Aguardando mensagens de clientes e motoboys...
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {threads.map((thread) => (
                <button
                  key={thread.threadId}
                  onClick={() => {
                    setCurrentThreadId(thread.threadId);
                    setShowThreadList(false);
                  }}
                  className="w-full p-4 hover:bg-accent text-left transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm truncate">
                          {thread.participantName}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {thread.category === 'status_entrega' && '🚚'}
                          {thread.category === 'suporte' && '💬'}
                          {thread.category === 'problema' && '⚠️'}
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
      )}
      {/* Menu de Seleção de Categoria */}
      {!selectedCategory && currentUserRole !== 'central' && (
        <div className="flex-1 p-6 space-y-4">
          <p className="text-sm text-muted-foreground mb-6">
            Selecione o tipo de conversa que deseja iniciar:
          </p>

          <button
            onClick={() => handleCategorySelect('status_entrega')}
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
            onClick={() => handleCategorySelect('suporte')}
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
            onClick={() => handleCategorySelect('problema')}
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
      )}

      {/* Lista de Mensagens */}
      {!showThreadList && (selectedCategory || (isCentral && currentThreadId)) && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={messagesScrollRef}>
            {(() => {
              // Filtra mensagens da thread atual
              const threadMessages = currentThreadId 
                ? messages.filter(m => m.threadId === currentThreadId)
                : messages;
              
              return threadMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground text-center">
                    {currentUserRole === 'central' 
                      ? 'Nenhuma mensagem ainda. Aguardando contatos...' 
                      : 'Nenhuma mensagem. Inicie a conversa!'}
                  </p>
                </div>
              ) : (
                threadMessages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onAISuggestion={isCentral ? handleAISuggestion : undefined}
                    loadingAISuggestion={loadingAISuggestion}
                  />
                ))
              );
            })()}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de Mensagem */}
          <div className="border-t p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1"
                disabled={sendMutation.isPending}
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!message.trim() || sendMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              Suas mensagens são enviadas para a Central
            </p>
          </div>
        </>
      )}
    </div>
  );
}
