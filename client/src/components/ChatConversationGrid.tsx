/**
 * COMPONENTE: ChatConversationGrid
 * PROPÓSITO: Grid de pedidos + conversas gerais para a Central
 * BASEADO EM: prototipos/chat-central-com-geral.html
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock, MessageCircle, Package } from "lucide-react";
import type { Order } from "@shared/schema";
import type { ChatConversation } from "@shared/schema";

interface ChatConversationGridProps {
  orders: Order[];
  conversations: ChatConversation[];
  selectedConversation: ChatConversation | null;
  selectedOrder: Order | null;
  onSelectConversation: (conversation: ChatConversation) => void;
  onSelectOrder: (order: Order) => void;
}

export function ChatConversationGrid({
  orders,
  conversations,
  selectedConversation,
  selectedOrder,
  onSelectConversation,
  onSelectOrder,
}: ChatConversationGridProps) {
  const [filter, setFilter] = useState<'all' | 'orders' | 'general'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar pedidos ativos (não entregues/cancelados)
  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');

  // Filtrar conversas gerais (sem pedido)
  const generalConversations = conversations.filter(c => !c.orderId);

  // Busca
  const filteredOrders = activeOrders.filter(o =>
    o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.motoboyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredConversations = generalConversations.filter(c =>
    c.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white border-r">
      {/* HEADER */}
      <div className="p-4 bg-gradient-to-br from-purple-600 to-purple-800 text-white">
        <h2 className="text-xl font-bold mb-3">📦 Pedidos & Conversas</h2>
        <Input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-3 bg-white/10 border-white/20 text-white placeholder:text-white/60"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            onClick={() => setFilter('all')}
            className="text-xs"
          >
            Todos ({activeOrders.length + generalConversations.length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'orders' ? 'secondary' : 'ghost'}
            onClick={() => setFilter('orders')}
            className="text-xs"
          >
            Pedidos ({activeOrders.length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'general' ? 'secondary' : 'ghost'}
            onClick={() => setFilter('general')}
            className="text-xs"
          >
            Gerais ({generalConversations.length})
          </Button>
        </div>
      </div>

      {/* SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* SEÇÃO: PEDIDOS ATIVOS */}
        {(filter === 'all' || filter === 'orders') && filteredOrders.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase text-gray-500 mb-2 px-1">
              📦 Pedidos Ativos
            </div>
            {filteredOrders.map(order => (
              <Card
                key={order.id}
                className={`p-4 mb-3 cursor-pointer transition-all hover:border-purple-400 hover:shadow-md ${
                  selectedOrder?.id === order.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                }`}
                onClick={() => onSelectOrder(order)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-sm">#{order.id.slice(0, 8)}</div>
                  <Badge variant={order.status === 'pending' ? 'destructive' : 'default'}>
                    {order.status === 'pending' && '🔴 Pendente'}
                    {order.status === 'in_progress' && '⏳ Em andamento'}
                    {order.status === 'delivered' && '✅ Entregue'}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Motoboy:</strong> {order.motoboyName || 'Não atribuído'}</div>
                  <div><strong>Cliente:</strong> {order.clientName}</div>
                  <div><strong>Valor:</strong> R$ {order.valor}</div>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* SEÇÃO: CONVERSAS GERAIS */}
        {(filter === 'all' || filter === 'general') && filteredConversations.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase text-muted-foreground mb-2 px-1">
              💬 Conversas Gerais
            </div>
            {filteredConversations.map(conversation => (
              <Card
                key={`${conversation.userId}-${conversation.orderId}`}
                className={`p-4 mb-3 cursor-pointer transition-all hover:border-green-400 hover:shadow-md border-2 ${
                  selectedConversation?.userId === conversation.userId && !selectedConversation?.orderId
                    ? 'border-green-500 bg-green-50 border-solid'
                    : 'border-green-300 border-dashed'
                }`}
                onClick={() => onSelectConversation(conversation)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-sm">💬 {conversation.userName}</div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    Conversa Geral
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div><strong>Assunto:</strong> {conversation.lastMessage.slice(0, 50)}...</div>
                  <div><strong>Tipo:</strong> {conversation.userRole === 'client' ? 'Cliente' : 'Motoboy'}</div>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(conversation.lastMessageAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {conversation.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {filteredOrders.length === 0 && filteredConversations.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma conversa encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
