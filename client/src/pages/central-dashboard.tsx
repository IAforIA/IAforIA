/**
 * ARQUIVO: client/src/pages/central-dashboard.tsx
 * PROPÓSITO: Painel administrativo da Central para monitorar pedidos, motoboys e estatísticas em tempo real
 * CONTEXTO: Usa WebSockets e React Query para dados atualizados sem recarregar a página
 */

// Layout principal com sidebar e gatilho de abertura
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
// Wouter fornece roteamento leve para subpáginas internas do dashboard
import { Switch, Route, Router as NestedRouter, useLocation } from "wouter";
// Componentes reutilizáveis da UI
import ThemeToggle from "@/components/ThemeToggle";
import StatCard from "@/components/StatCard";
import OrderCard from "@/components/OrderCard";
import { Package, TruckIcon, CheckCircle, Users, ExternalLink, UserCog, Shield, Ban, ShieldCheck, XCircle, RefreshCw, MessageSquare, Map, Settings, Store, Bike, AlertTriangle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// useQuery coordena chamadas REST com cache automático
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// useAuth expõe token/logoff para proteger o painel
import { useAuth } from "@/hooks/use-auth";
// Tipos compartilhados com o backend (Drizzle schema)
import type { Order, Motoboy, OrderStatus, Client } from "@shared/schema";
import { useEffect, useState } from "react";
import { resolveWebSocketUrl } from "@/lib/utils";
// Chat widget for real-time communication
import { ChatWidget } from "@/components/ChatWidget";
// Schedule viewer for driver availability
import { DriverScheduleViewer, DriverAvailabilityBadge } from "@/components/DriverScheduleViewer";
// AI-powered availability insights
import { AvailabilityInsights } from "@/components/AvailabilityInsights";
// Operational planning insights
import { OperationalInsights } from "@/components/OperationalInsights";
import { SettingsPage } from "@/components/SettingsPage";
import { ClientStatusBadge } from "@/components/ClientStatusBadge";
import { ClientScheduleViewer } from "@/components/ClientScheduleViewer";

export default function CentralDashboard() {
  // CONTEXTO GLOBAL: useAuth provê token JWT e função de logout
  const { logout, token, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  // ESTADO LOCAL: Guarda instância WebSocket para fechar ao desmontar
  const [ws, setWs] = useState<WebSocket | null>(null);
  // ESTADO: Dialog de visualização de schedule
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<{ id: string; name: string } | null>(null);
  
  // ESTADO: Dialog de horários do cliente
  const [clientScheduleDialogOpen, setClientScheduleDialogOpen] = useState(false);
  const [selectedClientForSchedule, setSelectedClientForSchedule] = useState<{ id: string; name: string } | null>(null);
  
  // ESTADO: Dialog de detalhamento financeiro

  // QUERY PRINCIPAL: Busca lista completa de pedidos (cacheado por React Query)
  const { data: orders = [], refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  // QUERY SECUNDÁRIA: Busca status online dos motoboys para indicadores
  const { data: motoboys = [], refetch: refetchMotoboys } = useQuery<Motoboy[]>({
    queryKey: ['/api/motoboys'],
    refetchInterval: 5000, // Atualiza a cada 5 segundos para mostrar status real
  });

  // QUERY: Busca usuários online via WebSocket
  const { data: onlineData, refetch: refetchOnline } = useQuery<{ onlineUsers: string[] }>({
    queryKey: ['/api/users/online'],
    refetchInterval: 5000, // Atualiza a cada 5 segundos
  });
  const onlineUserIds = onlineData?.onlineUsers || [];

  // QUERY TERCIÁRIA: Busca lista de clientes para gestão
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    enabled: !!token, // Só faz a query se tiver token
  });

  // QUERY: Busca TODOS os horários dos clientes de uma vez (otimização)
  const { data: allClientSchedules = [] } = useQuery<any[]>({
    queryKey: ['/api/schedules/all-clients'],
    enabled: !!token,
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  });

  // QUERY: Busca TODOS os horários dos motoboys de uma vez
  const { data: allMotoboySchedules = [] } = useQuery<any[]>({
    queryKey: ['/api/schedules/all-motoboys'],
    enabled: !!token,
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  });

  // STEP 4: Query de usuários
  const { data: usersData = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: !!token,
  });

  // STEP 13: Query para analytics dashboard (KPIs em tempo real)
  const { data: analyticsData } = useQuery<{
    todayRevenue: number;
    todayProfit: number;
    monthToDateRevenue: number;
    monthToDateProfit: number;
    mrr: number;
    activeDriversCount: number;
    pendingOrdersCount: number;
    pendingOrdersValue: number;
  }>({
    queryKey: ['/api/analytics/dashboard'],
    enabled: !!token,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Estado de busca de pedidos
  const [searchQuery, setSearchQuery] = useState('');

  // STEP 4: Mutation para alterar status de usuário
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string, status: string }) => {
      console.log('🔵 Frontend enviando para /api/users/:id/status:', { userId, status });
      try {
        const res = await apiRequest('PATCH', `/api/users/${userId}/status`, { status });
        const result = await res.json();
        console.log('✅ Resposta recebida:', result);
        return result;
      } catch (error) {
        console.error('❌ Erro na requisição:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: "Status atualizado com sucesso" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao atualizar status", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // STEP 4: Mutation para alterar role de usuário
  const changeUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      const res = await apiRequest('PATCH', `/api/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: "Função alterada com sucesso" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao alterar função", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Mutation para toggle online/offline de motoboy
  const toggleMotoboyOnlineMutation = useMutation({
    mutationFn: async ({ motoboyId, online }: { motoboyId: string, online: boolean }) => {
      const res = await apiRequest('PATCH', `/api/motoboys/${motoboyId}/online`, { online });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/motoboys'] });
      toast({ title: "Status do motoboy atualizado" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao atualizar status", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // STEP 5: Mutation para cancelar pedido
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest('PATCH', `/api/orders/${orderId}/cancel`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: "Pedido cancelado com sucesso" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao cancelar pedido", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // STEP 5: Mutation para reatribuir pedido
  const reassignOrderMutation = useMutation({
    mutationFn: async ({ orderId, motoboyId }: { orderId: string, motoboyId: string }) => {
      const res = await apiRequest('PATCH', `/api/orders/${orderId}/reassign`, { motoboyId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: "Pedido reatribuído com sucesso" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao reatribuir pedido", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // STEP 5: Estado para controlar modal de reatribuição
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedOrderForReassign, setSelectedOrderForReassign] = useState<string | null>(null);
  const [selectedMotoboyForReassign, setSelectedMotoboyForReassign] = useState<string>('');

  // EFEITO: Abre conexão WebSocket autenticada para receber eventos em tempo real
  useEffect(() => {
    if (!token) return; // Sem token não conectamos

    const websocket = new WebSocket(resolveWebSocketUrl(token));

    // Quando chegar mensagem relevante, revalida cache de pedidos e motoboys
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_order' || data.type === 'order_accepted' || data.type === 'order_delivered') {
        refetchOrders();
      }
      // Atualiza lista de motoboys e usuários online quando houver mudança de status
      if (data.type === 'driver_online' || data.type === 'driver_offline' || data.type === 'order_accepted') {
        refetchMotoboys();
        refetchOnline(); // Atualiza lista de usuários online
      }
    };

    websocket.onclose = () => console.log('WebSocket closed');
    websocket.onerror = (error) => console.error('WebSocket error:', error);
    websocket.onopen = () => console.log('WebSocket connected');

    // Guarda referência para eventual debug e encerra na limpeza do efeito
    setWs(websocket);
    return () => websocket.close();
  }, [refetchOrders, refetchMotoboys, refetchOnline, token]);

  // KPIs exibidos nos StatCards
  const totalOrders = orders.length;
  const inProgress = orders.filter(o => o.status === 'in_progress').length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  
  // Conta motoboys ativos: apenas os marcados como online=true na tabela motoboys
  // Não usa WebSocket porque os IDs da tabela users são diferentes dos IDs da tabela motoboys
  // O controle é 100% manual via botão Ativar/Desativar na aba Entregadores
  const activeDrivers = motoboys.filter((m: any) => m.online === true).length;
  
  // Log para debug
  console.log('📊 Dashboard Stats:', {
    totalMotoboys: motoboys.length,
    markedOnline: motoboys.filter((m: any) => m.online === true).length,
    motoboyIds: motoboys.map((m: any) => m.id),
    onlineUserIds,
    activeDrivers,
    rawMotoboyData: motoboys.slice(0, 3) // Primeiros 3 para debug
  });

  // CSS custom properties: controlam largura do sidebar responsivo
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  const LiveDocs = () => (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Live Docs - Comprovantes em Tempo Real</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.filter(o => o.status === 'delivered' && o.proofUrl).map(order => (
          <Card key={order.id} className="p-4">
            <div className="aspect-video relative mb-4 bg-muted rounded-md overflow-hidden">
              <img 
                src={order.proofUrl || ''} 
                alt={`Comprovante Pedido #${order.id}`}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Pedido #{order.id.slice(0, 8)}</span>
                <Badge variant="outline">{order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString() : '-'}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Motoboy: {order.motoboyName || 'N/A'}</p>
                <p>Cliente: {order.clientName || 'N/A'}</p>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <a href={order.proofUrl || '#'} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Original
                </a>
              </Button>
            </div>
          </Card>
        ))}
        {orders.filter(o => o.status === 'delivered' && o.proofUrl).length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>Nenhum comprovante disponível ainda.</p>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    // SidebarProvider aplica contextos (atalhos, largura customizada)
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        {/* Sidebar fixa com navegação específica do papel "central" */}
        <AppSidebar role="central" />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-semibold" data-testid="text-page-title">Dashboard Central</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" onClick={logout} data-testid="button-logout">Sair</Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <NestedRouter base="/central">
                <Switch>
                {/* Rota Principal do Dashboard (path="/") */}
                <Route path="/">
                  <>
                    {/* Grid de KPIs principais */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <StatCard title="Total Pedidos" value={totalOrders} icon={Package} />
                      <StatCard title="Em Andamento" value={inProgress} icon={TruckIcon} />
                      <StatCard title="Concluídos" value={delivered} icon={CheckCircle} />
                      <StatCard title="Entregadores Ativos" value={activeDrivers} icon={Users} />
                    </div>

                    {/* Chat Widget Integrado */}
                    {user && (
                      <Card className="p-4">
                        <ChatWidget
                          currentUserId={user.id}
                          currentUserName={user.name}
                          currentUserRole={user.role as 'client' | 'motoboy' | 'central'}
                        />
                      </Card>
                    )}

                    {/* Insights Operacionais - Planejamento de Frota */}
                    <OperationalInsights 
                      clientSchedules={allClientSchedules}
                      motoboySchedules={allMotoboySchedules}
                      activeMotoboys={motoboys.length}
                    />

                    {/* Barra de busca de pedidos */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <h2 className="text-lg font-semibold">Pedidos Recentes</h2>
                      <div className="flex gap-2 flex-1 max-w-md">
                        <Input
                          placeholder="Buscar por endereço, cliente..."
                          className="flex-1"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          data-testid="input-search-orders"
                        />
                        {searchQuery && (
                          <Button 
                            variant="outline" 
                            onClick={() => setSearchQuery('')}
                            data-testid="button-clear-search"
                          >
                            Limpar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Cards resumidos dos pedidos mais recentes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {orders.filter(order => {
                        if (!searchQuery.trim()) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          order.coletaRua?.toLowerCase().includes(query) ||
                          order.coletaBairro?.toLowerCase().includes(query) ||
                          order.entregaRua?.toLowerCase().includes(query) ||
                          order.entregaBairro?.toLowerCase().includes(query) ||
                          order.clientId?.toString().includes(query) ||
                          order.id?.toString().includes(query)
                        );
                      }).slice(0, 6).map((order) => (
                        <OrderCard
                          key={order.id}
                          id={order.id}
                          origin={`${order.coletaRua}, ${order.coletaNumero} - ${order.coletaBairro}`}
                          destination={`${order.entregaRua}, ${order.entregaNumero} - ${order.entregaBairro}`}
                          status={order.status as OrderStatus}
                          value={order.valor}
                          driverName={order.motoboyName || undefined}
                          onView={() => console.log('View order:', order.id)}
                          formaPagamento={order.formaPagamento}
                          hasTroco={order.hasTroco || false}
                          trocoValor={order.trocoValor || undefined}
                          complemento={order.coletaComplemento || undefined}
                          referencia={order.referencia || undefined}
                          observacoes={order.observacoes || undefined}
                          produtoNome={order.produtoNome || undefined}
                          produtoQuantidade={order.produtoQuantidade || undefined}
                          produtoPrecoUnitario={order.produtoPrecoUnitario || undefined}
                          produtoValorTotal={order.produtoValorTotal || undefined}
                        />
                      ))}
                    </div>

                    {/* Placeholder amigável quando não há pedidos */}
                    {orders.length === 0 && (
                      <Card className="p-12 text-center">
                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">Nenhum pedido cadastrado</p>
                      </Card>
                    )}

                    {/* Linha do tempo simples mostrando últimos eventos */}
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Atividade Recente</h3>
                      <div className="space-y-3">
                        {orders.slice(0, 5).map((order, idx) => (
                          <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {order.status === 'pending' && '🆕 Novo pedido criado'}
                                {order.status === 'in_progress' && '🚚 Em andamento'}
                                {order.status === 'delivered' && '✅ Entrega concluída'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {order.clientName} → {order.entregaBairro}, {order.entregaRua}
                              </p>
                              <p className="text-xs font-semibold text-green-600">
                                R$ {((order.valor ? Number(order.valor) : 0) + (order.produtoValorTotal ? Number(order.produtoValorTotal) : 0)).toFixed(2)}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                              {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </>
                </Route>

                {/* Sub-rota de Live Docs (path="/live-docs") */}
                <Route path="/live-docs">
                  <LiveDocs />
                </Route>

                {/* Sub-rota de Pedidos (path="/orders") */}
                <Route path="/orders">
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold">Gestão de Pedidos</h2>
                      <Button>
                        <Package className="w-4 h-4 mr-2" />
                        Novo Pedido
                      </Button>
                    </div>

                    {/* Filters */}
                    <Card className="p-4 mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Input placeholder="Buscar por ID ou cliente..." />
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          aria-label="Filtrar por status"
                        >
                          <option value="">Todos os status</option>
                          <option value="pending">Pendente</option>
                          <option value="in_progress">Em Andamento</option>
                          <option value="delivered">Entregue</option>
                        </select>
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          aria-label="Filtrar por motoboy"
                        >
                          <option value="">Todos os motoboys</option>
                          {motoboys.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        <Button variant="outline">Limpar Filtros</Button>
                      </div>
                    </Card>

                    {/* Orders Table */}
                    <Card>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left p-4 font-semibold">ID</th>
                              <th className="text-left p-4 font-semibold">Cliente</th>
                              <th className="text-left p-4 font-semibold">Origem</th>
                              <th className="text-left p-4 font-semibold">Destino</th>
                              <th className="text-left p-4 font-semibold">Motoboy</th>
                              <th className="text-left p-4 font-semibold">Valor</th>
                              <th className="text-left p-4 font-semibold">Status</th>
                              <th className="text-left p-4 font-semibold">Comprovante</th>
                              <th className="text-left p-4 font-semibold">Data</th>
                              <th className="text-left p-4 font-semibold">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map(order => (
                              <tr key={order.id} className="border-b hover:bg-muted/50">
                                <td className="p-4 font-mono text-sm">#{order.id.slice(0, 8)}</td>
                                <td className="p-4">{order.clientName}</td>
                                <td className="p-4 text-sm">{order.coletaBairro}</td>
                                <td className="p-4 text-sm">{order.entregaBairro}</td>
                                <td className="p-4">{order.motoboyName || '-'}</td>
                                <td className="p-4">R$ {parseFloat(order.valor).toFixed(2)}</td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {order.status === 'pending' && 'Pendente'}
                                    {order.status === 'in_progress' && 'Em Andamento'}
                                    {order.status === 'delivered' && 'Entregue'}
                                    {order.status === 'cancelled' && 'Cancelado'}
                                  </span>
                                </td>
                                <td className="p-4">
                                  {order.proofUrl ? (
                                    <a href={order.proofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                                      Ver <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </td>
                                <td className="p-4 text-sm">
                                  {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                      <>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedOrderForReassign(order.id);
                                            setReassignDialogOpen(true);
                                          }}
                                          disabled={reassignOrderMutation.isPending}
                                        >
                                          <RefreshCw className="w-3 h-3 mr-1" />
                                          Reatribuir
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="destructive"
                                          onClick={() => {
                                            if (confirm('Tem certeza que deseja cancelar este pedido?')) {
                                              cancelOrderMutation.mutate(order.id);
                                            }
                                          }}
                                          disabled={cancelOrderMutation.isPending}
                                        >
                                          <XCircle className="w-3 h-3 mr-1" />
                                          Cancelar
                                        </Button>
                                      </>
                                    )}
                                    {(order.status === 'delivered' || order.status === 'cancelled') && (
                                      <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>

                    {/* Reassign Dialog */}
                    <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reatribuir Pedido</DialogTitle>
                          <DialogDescription>
                            Selecione um motoboy para reatribuir este pedido
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Select 
                            value={selectedMotoboyForReassign} 
                            onValueChange={setSelectedMotoboyForReassign}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um motoboy" />
                            </SelectTrigger>
                            <SelectContent>
                              {motoboys.map(motoboy => (
                                <SelectItem key={motoboy.id} value={motoboy.id}>
                                  {motoboy.name} {motoboy.online ? '(Online)' : '(Offline)'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setReassignDialogOpen(false);
                              setSelectedMotoboyForReassign('');
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => {
                              if (selectedOrderForReassign && selectedMotoboyForReassign) {
                                reassignOrderMutation.mutate({
                                  orderId: selectedOrderForReassign,
                                  motoboyId: selectedMotoboyForReassign,
                                });
                                setReassignDialogOpen(false);
                                setSelectedOrderForReassign(null);
                                setSelectedMotoboyForReassign('');
                              }
                            }}
                            disabled={!selectedMotoboyForReassign || reassignOrderMutation.isPending}
                          >
                            {reassignOrderMutation.isPending ? 'Reatribuindo...' : 'Reatribuir'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                </Route>

                {/* Sub-rota de Clientes (path="/clients") */}
                <Route path="/clients">
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold">Gestão de Clientes</h2>
                      <Button>
                        <Users className="w-4 h-4 mr-2" />
                        Novo Cliente
                      </Button>
                    </div>

                    {/* Search */}
                    <Card className="p-4 mb-6">
                      <Input placeholder="Buscar por nome, telefone ou email..." />
                    </Card>

                    {/* Clients Table */}
                    <Card>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left p-4 font-semibold">Nome</th>
                              <th className="text-left p-4 font-semibold">Telefone</th>
                              <th className="text-left p-4 font-semibold">Email</th>
                              <th className="text-left p-4 font-semibold">Status</th>
                              <th className="text-left p-4 font-semibold">Pedidos</th>
                              <th className="text-left p-4 font-semibold">Cadastro</th>
                              <th className="text-left p-4 font-semibold">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clients.length === 0 ? (
                              <tr className="border-b">
                                <td className="p-4 text-muted-foreground text-center" colSpan={7}>
                                  Nenhum cliente cadastrado
                                </td>
                              </tr>
                            ) : (
                              clients.map(client => {
                                // Filtra schedules deste cliente (usa clientId do banco)
                                const clientSchedules = allClientSchedules.filter(s => 
                                  s.clientId === client.id || s.clientId === String(client.id)
                                );
                                
                                return (
                                  <tr key={client.id} className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">{client.name}</td>
                                    <td className="p-4">{client.phone}</td>
                                    <td className="p-4">{client.email}</td>
                                    <td className="p-4">
                                      <ClientStatusBadge clientId={client.id} schedules={clientSchedules} />
                                    </td>
                                    <td className="p-4">
                                      {orders.filter(o => o.clientId === client.id).length}
                                    </td>
                                    <td className="p-4 text-sm">
                                      {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="p-4">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => {
                                          setSelectedClientForSchedule({ id: client.id, name: client.name });
                                          setClientScheduleDialogOpen(true);
                                        }}
                                      >
                                        Ver Horários
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </>
                </Route>

                {/* Sub-rota de Entregadores (path="/drivers") */}
                <Route path="/drivers">
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold">Gestão de Motoboys</h2>
                      <Button>
                        <TruckIcon className="w-4 h-4 mr-2" />
                        Novo Motoboy
                      </Button>
                    </div>

                    {/* Search */}
                    <Card className="p-4 mb-6">
                      <div className="flex gap-4">
                        <Input placeholder="Buscar por nome ou telefone..." className="flex-1" />
                        <select 
                          className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          aria-label="Filtrar por disponibilidade"
                        >
                          <option value="">Todos</option>
                          <option value="available">Disponíveis</option>
                          <option value="busy">Ocupados</option>
                        </select>
                      </div>
                    </Card>

                    {/* Drivers Table */}
                    <Card>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left p-4 font-semibold">Nome</th>
                              <th className="text-left p-4 font-semibold">Telefone</th>
                              <th className="text-left p-4 font-semibold">Placa</th>
                              <th className="text-left p-4 font-semibold">Situação</th>
                              <th className="text-left p-4 font-semibold">Disponibilidade</th>
                              <th className="text-left p-4 font-semibold">Pedidos Ativos</th>
                              <th className="text-left p-4 font-semibold">Última Atualização</th>
                              <th className="text-left p-4 font-semibold">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {motoboys.map(motoboy => (
                              <tr key={motoboy.id} className="border-b hover:bg-muted/50">
                                <td className="p-4 font-medium">{motoboy.name}</td>
                                <td className="p-4">{motoboy.phone}</td>
                                <td className="p-4 font-mono">{motoboy.placa}</td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      motoboy.online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {motoboy.online ? 'Online' : 'Offline'}
                                    </span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => toggleMotoboyOnlineMutation.mutate({ 
                                        motoboyId: motoboy.id, 
                                        online: !motoboy.online 
                                      })}
                                      className="h-6 px-2 text-xs"
                                    >
                                      {motoboy.online ? 'Desativar' : 'Ativar'}
                                    </Button>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <DriverAvailabilityBadge motoboyId={motoboy.id} />
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => {
                                        setSelectedDriver({ id: motoboy.id, name: motoboy.name });
                                        setScheduleDialogOpen(true);
                                      }}
                                      className="h-6 px-2 text-xs"
                                    >
                                      Ver schedule
                                    </Button>
                                  </div>
                                </td>
                                <td className="p-4">
                                  {orders.filter(o => o.motoboyId === motoboy.id && o.status === 'in_progress').length}
                                </td>
                                <td className="p-4 text-sm">
                                  {motoboy.updatedAt ? new Date(motoboy.updatedAt).toLocaleString('pt-BR') : '-'}
                                </td>
                                <td className="p-4">
                                  <Button variant="ghost" size="sm">Editar</Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </>
                </Route>

                {/* Sub-rota de Financeiro (path="/financial") */}
                <Route path="/financial">
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold">💰 Gestão Financeira - Repasse Diário</h2>
                    </div>

                    {/* Filtro de Data */}
                    <Card className="p-6 mb-6">
                      <h3 className="text-lg font-semibold mb-4">📅 Selecionar Período</h3>
                      <div className="flex gap-4 items-end flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-sm font-medium mb-2">Data Inicial</label>
                          <Input 
                            type="date" 
                            defaultValue={new Date().toISOString().split('T')[0]}
                            id="start-date"
                          />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-sm font-medium mb-2">Data Final</label>
                          <Input 
                            type="date" 
                            defaultValue={new Date().toISOString().split('T')[0]}
                            id="end-date"
                          />
                        </div>
                        <Button className="bg-green-600 hover:bg-green-700">
                          🔍 Filtrar
                        </Button>
                        <Button variant="outline" onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          (document.getElementById('start-date') as HTMLInputElement).value = today;
                          (document.getElementById('end-date') as HTMLInputElement).value = today;
                        }}>
                          Hoje
                        </Button>
                        <Button variant="outline" onClick={() => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          const yesterdayStr = yesterday.toISOString().split('T')[0];
                          (document.getElementById('start-date') as HTMLInputElement).value = yesterdayStr;
                          (document.getElementById('end-date') as HTMLInputElement).value = yesterdayStr;
                        }}>
                          Ontem
                        </Button>
                      </div>
                    </Card>

                    {/* Resumo Geral do Período */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      {(() => {
                        const deliveredOrders = orders.filter(o => o.status === 'delivered');
                        // IMPORTANTE: order.valor é o FRETE (7, 8, 10 ou 15 reais) - é o que GuiriExpress recebe
                        const totalFrete = deliveredOrders.reduce((sum, o) => sum + Number(o.valor || 0), 0);
                        const totalProduto = deliveredOrders.reduce((sum, o) => sum + Number(o.produtoValorTotal || 0), 0);
                        const totalMotoboy = deliveredOrders.reduce((sum, o) => sum + Number(o.taxaMotoboy || 0), 0);
                        // Volume de Produtos = VALOR TOTAL dos pedidos (frete + produto)
                        const volumeTotal = totalFrete + totalProduto;
                        const lucroGuriri = totalFrete - totalMotoboy;
                        
                        return (
                          <>
                            <Card className="p-4 bg-green-50 dark:bg-green-950">
                              <p className="text-sm text-muted-foreground">Receita de Fretes</p>
                              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                R$ {totalFrete.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {deliveredOrders.length} entregas
                              </p>
                            </Card>
                            <Card className="p-4 bg-amber-50 dark:bg-amber-950">
                              <p className="text-sm text-muted-foreground">Pagar Motoboys</p>
                              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                                R$ {totalMotoboy.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Repasse total
                              </p>
                            </Card>
                            <Card className="p-4 bg-blue-50 dark:bg-blue-950">
                              <p className="text-sm text-muted-foreground">Lucro Guriri</p>
                              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                R$ {lucroGuriri.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Frete - Motoboy
                              </p>
                            </Card>
                            <Card className="p-4 bg-purple-50 dark:bg-purple-950">
                              <p className="text-sm text-muted-foreground">Volume de Produtos</p>
                              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                R$ {volumeTotal.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Valor total dos pedidos
                              </p>
                            </Card>
                          </>
                        );
                      })()}
                    </div>

                    {/* Relatório: Quanto Pagar para Cada Motoboy */}
                    <Card className="p-6 mb-6">
                      <h3 className="text-lg font-semibold mb-4 text-green-700 dark:text-green-300">
                        💵 REPASSE PARA MOTOBOYS
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr className="text-left">
                              <th className="p-3">Motoboy</th>
                              <th className="p-3 text-right">Entregas</th>
                              <th className="p-3 text-right">Total a Pagar</th>
                              <th className="p-3">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              // Agrupa pedidos por motoboy
                              const motoboyOrders = orders
                                .filter(o => o.status === 'delivered' && o.motoboyId)
                                .reduce((acc, order) => {
                                  const key = order.motoboyId!;
                                  if (!acc[key]) {
                                    acc[key] = {
                                      motoboyId: key,
                                      motoboyName: order.motoboyName || 'Desconhecido',
                                      orders: [],
                                      total: 0,
                                    };
                                  }
                                  acc[key].orders.push(order);
                                  acc[key].total += Number(order.taxaMotoboy || 0);
                                  return acc;
                                }, {} as Record<string, { motoboyId: string; motoboyName: string; orders: typeof orders; total: number }>);

                              return Object.values(motoboyOrders).map((data) => (
                                <tr key={data.motoboyId} className="border-b hover:bg-muted/50">
                                  <td className="p-3 font-semibold">{data.motoboyName}</td>
                                  <td className="p-3 text-right">{data.orders.length}</td>
                                  <td className="p-3 text-right">
                                    <span className="font-bold text-green-600 text-lg">
                                      R$ {data.total.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        const details = data.orders.map((o, i) => 
                                          `${i + 1}. ${new Date(o.deliveredAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${o.clientName} → ${o.entregaBairro} - R$ ${Number(o.taxaMotoboy).toFixed(2)}`
                                        ).join('\n');
                                        alert(`Detalhes - ${data.motoboyName}\n\nTotal: R$ ${data.total.toFixed(2)}\n\n${details}`);
                                      }}
                                    >
                                      Ver Detalhes
                                    </Button>
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </Card>

                    {/* Relatório: Quanto Cobrar de Cada Cliente */}
                    <Card className="p-6 mb-6">
                      <h3 className="text-lg font-semibold mb-4 text-blue-700 dark:text-blue-300">
                        🧾 REPASSE DE FRETES DOS CLIENTES
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        💡 Cobrança: <strong>Mensalidade</strong> (1x/mês) + <strong>Repasse de Fretes</strong> (semanal ou diário)
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr className="text-left">
                              <th className="p-3">Cliente</th>
                              <th className="p-3 text-right">Pedidos</th>
                              <th className="p-3 text-right">Repasse de Frete</th>
                              <th className="p-3 text-right">Volume Produtos</th>
                              <th className="p-3 text-right">Total Movimentado</th>
                              <th className="p-3">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              // Agrupa pedidos por cliente
                              const clientOrders = orders
                                .filter(o => o.status === 'delivered' && o.clientId)
                                .reduce((acc, order) => {
                                  const key = order.clientId;
                                  if (!acc[key]) {
                                    acc[key] = {
                                      clientId: key,
                                      clientName: order.clientName || 'Desconhecido',
                                      orders: [],
                                      totalFrete: 0,
                                      totalProduto: 0,
                                    };
                                  }
                                  acc[key].orders.push(order);
                                  acc[key].totalFrete += Number(order.valor || 0);
                                  acc[key].totalProduto += Number(order.produtoValorTotal || 0);
                                  return acc;
                                }, {} as Record<string, { clientId: string; clientName: string; orders: typeof orders; totalFrete: number; totalProduto: number }>);

                              return Object.values(clientOrders).map((data) => {
                                const totalMovimentado = data.totalFrete + data.totalProduto;
                                return (
                                  <tr key={data.clientId} className="border-b hover:bg-muted/50">
                                    <td className="p-3 font-semibold">{data.clientName}</td>
                                    <td className="p-3 text-right">{data.orders.length}</td>
                                    <td className="p-3 text-right">
                                      <span className="font-bold text-blue-600 text-lg">
                                        R$ {data.totalFrete.toFixed(2)}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right">R$ {data.totalProduto.toFixed(2)}</td>
                                    <td className="p-3 text-right">R$ {totalMovimentado.toFixed(2)}</td>
                                    <td className="p-3">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                          const details = data.orders.map((o, i) => 
                                            `${i + 1}. ${new Date(o.deliveredAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${o.entregaBairro}, ${o.entregaRua} - Frete: R$ ${Number(o.valor).toFixed(2)} + Produto: R$ ${Number(o.produtoValorTotal || 0).toFixed(2)}`
                                          ).join('\n');
                                          alert(`Detalhes - ${data.clientName}\n\nREPASSE DE FRETE: R$ ${data.totalFrete.toFixed(2)}\nVolume de Produtos: R$ ${data.totalProduto.toFixed(2)}\nTotal Movimentado: R$ ${totalMovimentado.toFixed(2)}\n\n${details}`);
                                        }}
                                      >
                                        Ver Detalhes
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </Card>

                    {/* Tabela Detalhada de Todos os Pedidos */}
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">📋 Todos os Pedidos Entregues no Período</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b bg-muted/50">
                            <tr className="text-left">
                              <th className="p-2">Horário</th>
                              <th className="p-2">Cliente</th>
                              <th className="p-2">Motoboy</th>
                              <th className="p-2">Endereço Entrega</th>
                              <th className="p-2 text-right">Frete</th>
                              <th className="p-2 text-right">Produto</th>
                              <th className="p-2 text-right">Total</th>
                              <th className="p-2 text-right">Motoboy Recebe</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders
                              .filter(o => o.status === 'delivered')
                              .sort((a, b) => new Date(b.deliveredAt!).getTime() - new Date(a.deliveredAt!).getTime())
                              .map((order) => {
                                const frete = Number(order.valor || 0);
                                const produto = Number(order.produtoValorTotal || 0);
                                const total = frete + produto;
                                const motoboyRecebe = Number(order.taxaMotoboy || 0);
                                
                                return (
                                  <tr key={order.id} className="border-b hover:bg-muted/30">
                                    <td className="p-2 whitespace-nowrap">
                                      {new Date(order.deliveredAt!).toLocaleString('pt-BR', { 
                                        day: '2-digit', 
                                        month: '2-digit',
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </td>
                                    <td className="p-2">{order.clientName}</td>
                                    <td className="p-2">{order.motoboyName}</td>
                                    <td className="p-2">{order.entregaBairro}, {order.entregaRua}</td>
                                    <td className="p-2 text-right">R$ {frete.toFixed(2)}</td>
                                    <td className="p-2 text-right">R$ {produto.toFixed(2)}</td>
                                    <td className="p-2 text-right font-semibold">R$ {total.toFixed(2)}</td>
                                    <td className="p-2 text-right text-green-600 font-semibold">
                                      R$ {motoboyRecebe.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </>
                </Route>

                {/* Sub-rota de Relatórios (path="/reports") */}
                <Route path="/reports">
                  <>
                    <h2 className="text-2xl font-bold mb-6">Relatórios e Análises</h2>

                    {/* KPIs - Dados em tempo real via analytics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <Card 
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" 
                        onClick={() => setFinancialDetailsOpen(true)}
                      >
                        <p className="text-sm text-muted-foreground">Receita Hoje 💰</p>
                        <p className="text-3xl font-bold mt-2">
                          R$ {(analyticsData?.todayRevenue ?? 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Lucro Guriri: R$ {(analyticsData?.todayProfit ?? 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-blue-600 mt-2">📊 Clique para detalhes</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Receita do Mês</p>
                        <p className="text-3xl font-bold mt-2 text-green-600">
                          R$ {(analyticsData?.monthToDateRevenue ?? 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Lucro Guriri: R$ {(analyticsData?.monthToDateProfit ?? 0).toFixed(2)}
                        </p>
                      </Card>
                      <Card 
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setFinancialDetailsOpen(true)}
                      >
                        <p className="text-sm text-muted-foreground">Valor Pendente ⏳</p>
                        <p className="text-3xl font-bold mt-2 text-amber-600">
                          R$ {(analyticsData?.pendingOrdersValue ?? 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {analyticsData?.pendingOrdersCount ?? 0} pedidos em andamento
                        </p>
                        <p className="text-xs text-blue-600 mt-2">📊 Clique para detalhes</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">MRR (Mensalidades)</p>
                        <p className="text-3xl font-bold mt-2 text-blue-600">
                          R$ {(analyticsData?.mrr ?? 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Receita recorrente mensal
                        </p>
                      </Card>
                    </div>

                    {/* Performance por Motoboy */}
                    <Card className="p-6 mb-6">
                      <h3 className="text-lg font-semibold mb-4">Performance dos Motoboys</h3>
                      <div className="space-y-4">
                        {motoboys.map(motoboy => {
                          const motoboyOrders = orders.filter(o => o.motoboyId === motoboy.id);
                          const delivered = motoboyOrders.filter(o => o.status === 'delivered').length;
                          const inProgress = motoboyOrders.filter(o => o.status === 'in_progress').length;
                          
                          return (
                            <div key={motoboy.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div>
                                <p className="font-medium">{motoboy.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {motoboyOrders.length} pedidos no total
                                </p>
                              </div>
                              <div className="flex gap-6 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Entregues:</span>{' '}
                                  <span className="font-semibold text-green-600">{delivered}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Em andamento:</span>{' '}
                                  <span className="font-semibold text-blue-600">{inProgress}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>

                    {/* Pedidos por Status */}
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Distribuição por Status</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">Pendentes</p>
                          <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mt-2">
                            {orders.filter(o => o.status === 'pending').length}
                          </p>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-200">Em Andamento</p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-2">
                            {orders.filter(o => o.status === 'in_progress').length}
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                          <p className="text-sm text-green-800 dark:text-green-200">Entregues</p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-2">
                            {orders.filter(o => o.status === 'delivered').length}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </>
                </Route>

                {/* Sub-rota de Usuários (path="/users") - STEP 4 */}
                <Route path="/users">
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <UserCog className="h-6 w-6" />
                        Gestão de Usuários
                      </h2>
                    </div>

                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Função</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usersData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                Nenhum usuário encontrado
                              </TableCell>
                            </TableRow>
                          ) : (
                            usersData.map((userData: any) => {
                              const isCurrentUser = userData.id === user?.id;
                              const roleIcon = 
                                userData.role === 'central' ? <Shield className="h-4 w-4 text-blue-500" /> :
                                userData.role === 'motoboy' ? <UserCog className="h-4 w-4 text-green-500" /> :
                                <UserCog className="h-4 w-4 text-gray-500" />;

                              return (
                                <TableRow key={userData.id}>
                                  <TableCell className="font-medium">
                                    {userData.nome}
                                    {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                                  </TableCell>
                                  <TableCell>{userData.email}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {roleIcon}
                                      {isCurrentUser ? (
                                        <span className="capitalize">{userData.role}</span>
                                      ) : (
                                        <Select
                                          value={userData.role}
                                          onValueChange={(newRole) => {
                                            changeUserRoleMutation.mutate({ userId: userData.id, role: newRole });
                                          }}
                                        >
                                          <SelectTrigger className="w-32">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="client">Cliente</SelectItem>
                                            <SelectItem value="motoboy">Motoboy</SelectItem>
                                            <SelectItem value="central">Central</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {userData.status === 'active' ? (
                                      <Badge variant="default" className="bg-green-500">
                                        <ShieldCheck className="h-3 w-3 mr-1" />
                                        Ativo
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive">
                                        <Ban className="h-3 w-3 mr-1" />
                                        Inativo
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {isCurrentUser ? (
                                      <span className="text-xs text-muted-foreground">Não pode editar próprio status</span>
                                    ) : (
                                      <Button
                                        variant={userData.status === 'active' ? 'destructive' : 'default'}
                                        size="sm"
                                        onClick={() => {
                                          const newStatus = userData.status === 'active' ? 'inactive' : 'active';
                                          toggleUserStatusMutation.mutate({ userId: userData.id, status: newStatus });
                                        }}
                                      >
                                        {userData.status === 'active' ? (
                                          <>
                                            <Ban className="h-3 w-3 mr-1" />
                                            Desativar
                                          </>
                                        ) : (
                                          <>
                                            <ShieldCheck className="h-3 w-3 mr-1" />
                                            Ativar
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </Card>
                  </>
                </Route>

                {/* Sub-rota de Configurações (path="/settings") */}
                <Route path="/settings">
                  <SettingsPage user={user} />
                </Route>

                </Switch>
              </NestedRouter>
            </div>
          </main>
        </div>
      </div>

      {/* Schedule Viewer Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Disponibilidade do Motoboy</DialogTitle>
            <DialogDescription>
              Visualização completa da disponibilidade semanal com insights da AI
            </DialogDescription>
          </DialogHeader>
          {selectedDriver && (
            <DriverScheduleViewer 
              motoboyId={selectedDriver.id} 
              motoboyName={selectedDriver.name}
              compact={false}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Schedule Viewer Dialog */}
      <Dialog open={clientScheduleDialogOpen} onOpenChange={setClientScheduleDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Horário de Funcionamento</DialogTitle>
            <DialogDescription>
              {selectedClientForSchedule?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedClientForSchedule && (
            <ClientScheduleViewer 
              clientId={selectedClientForSchedule.id} 
              clientName={selectedClientForSchedule.name}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientScheduleDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Financial Details Dialog */}
      <Dialog open={financialDetailsOpen} onOpenChange={setFinancialDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhamento Financeiro do Dia</DialogTitle>
            <DialogDescription>
              Breakdown completo de receitas e valores pendentes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Pedidos Entregues Hoje */}
            <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3">✅ Pedidos Entregues Hoje</h3>
              {(() => {
                const deliveredToday = orders.filter(o => {
                  if (o.status !== 'delivered' || !o.deliveredAt) return false;
                  const deliveredDate = new Date(o.deliveredAt);
                  const today = new Date();
                  return deliveredDate.toDateString() === today.toDateString();
                });
                
                const totalFrete = deliveredToday.reduce((sum, o) => sum + Number(o.valor || 0), 0);
                const totalProduto = deliveredToday.reduce((sum, o) => sum + Number(o.produtoValorTotal || 0), 0);
                const totalGeral = totalFrete + totalProduto;
                const totalMotoboy = deliveredToday.reduce((sum, o) => sum + Number(o.taxaMotoboy || 0), 0);
                const lucroGuriri = totalFrete - totalMotoboy;
                
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quantidade de pedidos:</span>
                      <span className="font-semibold">{deliveredToday.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor Frete (cliente pagou):</span>
                      <span className="font-semibold">R$ {totalFrete.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor Produtos (cliente pagou):</span>
                      <span className="font-semibold">R$ {totalProduto.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">RECEITA TOTAL HOJE:</span>
                      <span className="font-bold text-lg text-green-700 dark:text-green-300">
                        R$ {totalGeral.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-3 border-t pt-2">
                      <div className="flex justify-between">
                        <span>Taxa Motoboys:</span>
                        <span>R$ {totalMotoboy.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-blue-600">
                        <span>Lucro Guriri Express:</span>
                        <span>R$ {lucroGuriri.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Pedidos Pendentes */}
            <Card className="p-4 bg-amber-50 dark:bg-amber-950 border-amber-200">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-3">⏳ Pedidos Pendentes (Em Andamento)</h3>
              {(() => {
                const pending = orders.filter(o => o.status === 'pending' || o.status === 'in_progress');
                
                const totalFrete = pending.reduce((sum, o) => sum + Number(o.valor || 0), 0);
                const totalProduto = pending.reduce((sum, o) => sum + Number(o.produtoValorTotal || 0), 0);
                const totalGeral = totalFrete + totalProduto;
                
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quantidade de pedidos:</span>
                      <span className="font-semibold">{pending.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor Frete:</span>
                      <span className="font-semibold">R$ {totalFrete.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor Produtos:</span>
                      <span className="font-semibold">R$ {totalProduto.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">VALOR PENDENTE:</span>
                      <span className="font-bold text-lg text-amber-700 dark:text-amber-300">
                        R$ {totalGeral.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Este valor será movido para "Receita Hoje" quando os pedidos forem entregues
                    </p>
                  </div>
                );
              })()}
            </Card>

            {/* Lista de Pedidos Pendentes */}
            <div className="max-h-60 overflow-y-auto">
              <h4 className="font-semibold mb-2 text-sm">Pedidos Pendentes Detalhados:</h4>
              <div className="space-y-1">
                {orders.filter(o => o.status === 'pending' || o.status === 'in_progress').map(order => (
                  <div key={order.id} className="text-xs bg-muted p-2 rounded flex justify-between">
                    <span>{order.clientName} → {order.entregaBairro}</span>
                    <span className="font-semibold">
                      R$ {((Number(order.valor || 0)) + (Number(order.produtoValorTotal || 0))).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFinancialDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}