/**
 * useChat - Hook para gerenciar estado e lógica do chat
 */

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { resolveWebSocketUrl } from "@/lib/utils";
import { getSenderId, getSenderName, getSenderRole } from "../../../../shared/message-utils";
import type { ChatCategory, ThreadInfo, ChatWidgetProps, ChatMessageExtended } from "./types";

export function useChat({ currentUserId, currentUserName, currentUserRole, embedded = false }: ChatWidgetProps) {
  const isCentral = currentUserRole === 'central';
  const [isOpen, setIsOpen] = useState(embedded ? true : false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ChatCategory | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [loadingAISuggestion, setLoadingAISuggestion] = useState(false);
  const [showThreadList, setShowThreadList] = useState(isCentral);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const refetchRef = useRef<() => void>(() => {});
  const { token } = useAuth();

  const shouldFetchMessages = isOpen || (!isCentral && !embedded);

  // Auto-seleciona categoria padrão para cliente/motoboy
  useEffect(() => {
    if (!isCentral && isOpen && !selectedCategory) {
      const defaultCategory: ChatCategory = 'suporte';
      setSelectedCategory(defaultCategory);
      setCurrentThreadId(`${currentUserId}_${defaultCategory}`);
    }
  }, [isCentral, isOpen, selectedCategory, currentUserId]);

  // Query: busca mensagens
  const { data: messages = [], refetch } = useQuery<ChatMessageExtended[]>({
    queryKey: (isCentral && currentThreadId)
      ? [`/api/chat?threadId=${currentThreadId}`]
      : ['/api/chat'],
    enabled: shouldFetchMessages,
    refetchInterval: shouldFetchMessages && !isMinimized ? (isOpen ? 3000 : 10000) : false,
  });

  refetchRef.current = refetch;

  // Zera contagem ao abrir
  useEffect(() => {
    if (isOpen) {
      setLastReadTimestamp(Date.now());
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Atualiza contagem de não lidas
  useEffect(() => {
    if (isOpen || isCentral || isMinimized || embedded) return;
    const newUnread = messages.filter((m) => {
      const created = new Date(m.createdAt).getTime();
      return created > lastReadTimestamp && getSenderId(m as any) !== currentUserId;
    }).length;
    setUnreadCount(newUnread);
  }, [isOpen, isCentral, isMinimized, embedded, messages, lastReadTimestamp, currentUserId]);

  // WebSocket para atualizações em tempo real
  useEffect(() => {
    if (!shouldFetchMessages || !token) return;

    const websocket = new WebSocket(resolveWebSocketUrl(token));

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          refetchRef.current();
        }
      } catch (error) {
        console.error('Erro ao processar WebSocket:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => websocket.close();
  }, [shouldFetchMessages, token]);

  // Auto-scroll
  useEffect(() => {
    if (isMinimized) return;
    const el = messagesScrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  // Refetch ao abrir ou trocar thread
  useEffect(() => {
    if (isOpen) refetch();
  }, [isOpen, currentThreadId, selectedCategory, refetch]);

  // Agrupa mensagens por thread (para Central)
  const threadGroups = isCentral ? messages.reduce((acc, msg) => {
    if (getSenderId(msg) === currentUserId) return acc;
    if (!acc[msg.threadId]) acc[msg.threadId] = [];
    acc[msg.threadId].push(msg);
    return acc;
  }, {} as Record<string, ChatMessageExtended[]>) : {};

  const threads: ThreadInfo[] = Object.entries(threadGroups).map(([threadId, msgs]) => {
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

  // Mutation: enviar mensagem
  const sendMutation = useMutation({
    mutationFn: async (messageData: {
      message: string;
      category: ChatCategory;
      threadId?: string;
      receiverId?: string | null;
      toRole?: string | null;
      senderId: string;
      senderName: string;
      senderRole: ChatWidgetProps['currentUserRole'];
    }) => {
      const res = await apiRequest('POST', '/api/chat', messageData);
      return await res.json() as ChatMessageExtended;
    },
    onSuccess: () => {
      setMessage("");
      refetch();
    },
    onError: (error) => {
      console.error('Erro ao enviar mensagem:', error);
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    if (!isCentral && !selectedCategory) return;

    const messageCategory = selectedCategory || 'suporte';
    const threadId = currentThreadId || `${currentUserId}_${messageCategory}`;
    const toId = isCentral ? (currentThreadId ? currentThreadId.split('_')[0] : null) : null;
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

    if (!currentThreadId) setCurrentThreadId(threadId);
    setLastReadTimestamp(Date.now());
    setUnreadCount(0);
  };

  const handleCategorySelect = (category: ChatCategory) => {
    setSelectedCategory(category);
    setCurrentThreadId(`${currentUserId}_${category}`);
  };

  const handleBackToMenu = () => {
    if (isCentral) {
      setShowThreadList(true);
      setCurrentThreadId(null);
      setMessage("");
    } else {
      setSelectedCategory(null);
      setCurrentThreadId(null);
      setMessage("");
    }
  };

  const handleSelectThread = (threadId: string) => {
    setCurrentThreadId(threadId);
    setShowThreadList(false);
  };

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
      if (data.suggestion) setMessage(data.suggestion);
    } catch (error: any) {
      console.error('Erro ao buscar sugestão:', error);
      alert(error.message || 'Erro ao buscar sugestão de IA');
    } finally {
      setLoadingAISuggestion(false);
    }
  };

  const handleStartNewConversation = (recipientId: string, recipientName: string, role: 'client' | 'motoboy') => {
    const threadId = `${recipientId}_suporte`;
    setCurrentThreadId(threadId);
    setSelectedCategory('suporte');
    setShowThreadList(false);
    setShowNewConversationDialog(false);
  };

  // Filtra mensagens da thread atual
  const currentMessages = currentThreadId 
    ? messages.filter(m => m.threadId === currentThreadId)
    : messages;

  return {
    // State
    isOpen, setIsOpen,
    isMinimized, setIsMinimized,
    message, setMessage,
    selectedCategory,
    currentThreadId,
    loadingAISuggestion,
    showThreadList,
    showNewConversationDialog, setShowNewConversationDialog,
    unreadCount,
    isCentral,
    embedded,
    
    // Refs
    messagesEndRef,
    messagesScrollRef,
    
    // Data
    threads,
    currentMessages,
    sendMutation,
    
    // Handlers
    handleSend,
    handleCategorySelect,
    handleBackToMenu,
    handleSelectThread,
    handleAISuggestion,
    handleStartNewConversation,
  };
}
