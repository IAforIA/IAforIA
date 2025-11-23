/**
 * ARQUIVO: client/src/pages/central-dashboard.tsx
 * PROPÓSITO: Painel administrativo da Central para monitorar pedidos, motoboys e estatísticas em tempo real
 * CONTEXTO: Usa WebSockets e React Query para dados atualizados sem recarregar a página
 */

// Layout principal com sidebar e gatilho de abertura
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
// Wouter fornece roteamento leve para subpáginas internas do dashboard
import { Switch, Route, Router as NestedRouter } from "wouter";
// Componentes reutilizáveis da UI
import ThemeToggle from "@/components/ThemeToggle";
import StatCard from "@/components/StatCard";
import OrderCard from "@/components/OrderCard";
import { Package, TruckIcon, CheckCircle, Users, ExternalLink, UserCog, Shield, Ban, ShieldCheck, XCircle, RefreshCw } from "lucide-react";
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
// Delivery map for real-time tracking
import { DeliveryMap } from "@/components/DeliveryMap";
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
  // ESTADO LOCAL: Guarda instância WebSocket para fechar ao desmontar
  const [ws, setWs] = useState<WebSocket | null>(null);
  // ESTADO: Dialog de visualização de schedule
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<{ id: string; name: string } | null>(null);
  
  // ESTADO: Dialog de horários do cliente
  const [clientScheduleDialogOpen, setClientScheduleDialogOpen] = useState(false);
  const [selectedClientForSchedule, setSelectedClientForSchedule] = useState<{ id: string; name: string } | null>(null);
  
  // ESTADO: Dialog de detalhamento financeiro
  const [financialDetailsOpen, setFinancialDetailsOpen] = useState(false);
  
  // ESTADO: Filtros de Pedidos
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderClientFilter, setOrderClientFilter] = useState<string>('all');
  const [orderMotoboyFilter, setOrderMotoboyFilter] = useState<string>('all');
  const [orderDateFilter, setOrderDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [orderSearchFilter, setOrderSearchFilter] = useState<string>('');
  
  // ESTADO: Filtros Financeiros
  const [finStartDate, setFinStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [finEndDate, setFinEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [finMotoboyFilter, setFinMotoboyFilter] = useState<string>('all');
  const [finClientFilter, setFinClientFilter] = useState<string>('all');

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
  
  // Log de debug
  useEffect(() => {
    if (allClientSchedules.length > 0) {
      console.log('📅 Dashboard - allClientSchedules carregados:', allClientSchedules.length, allClientSchedules);
      console.log('📅 Exemplo de schedule:', allClientSchedules[0]);
      
      // Testa filtro com primeiro cliente
      if (clients.length > 0) {
        const firstClient = clients[0];
        const filtered = allClientSchedules.filter(s => String(s.clientId) === String(firstClient.id));
        console.log('🔍 TESTE FILTRO:', {
          clientId: firstClient.id,
          clientName: firstClient.name,
          schedulesEncontrados: filtered.length,
          scheduleClientIds: allClientSchedules.map(s => s.clientId).slice(0, 5),
          filteredSchedules: filtered
        });
      }
    } else {
      console.warn('⚠️ Dashboard - allClientSchedules está VAZIO!');
    }
  }, [allClientSchedules, clients]);

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
      <div className="flex h-screen w-full relative">
        {/* Sidebar fixa com navegação específica do papel "central" */}
        <AppSidebar role="central" />
        <div className="flex flex-col flex-1 relative z-0">
          <header className="flex items-center justify-between p-3 sm:p-4 border-b bg-background sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-base sm:text-lg md:text-xl font-semibold truncate" data-testid="text-page-title">Dashboard Central</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" onClick={logout} data-testid="button-logout" className="text-xs sm:text-sm px-2 sm:px-4">
                <span className="hidden sm:inline">Sair</span>
                <span className="sm:hidden">✕</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 relative z-0">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
              <NestedRouter base="/central">
                <Switch>
                {/* Rota Principal do Dashboard (path="/") */}
                <Route path="/">
                  <>
                    {/* LAYOUT REORGANIZADO: 2 colunas - Mapa grande à esquerda, Schedules à direita */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6 relative">
                      {/* COLUNA 1: Mapa de Entregas (2/3 da largura) - PRIORIDADE MÁXIMA */}
                      <div className="lg:col-span-2 relative z-0 order-2 lg:order-1">
                        <DeliveryMap 
                          clients={clients}
                          orders={orders}
                          motoboys={motoboys}
                        />
                      </div>

                      {/* COLUNA 2: Schedules e Status (1/3 da largura) */}
                      <div className="space-y-4 order-1 lg:order-2">
                        {/* KPIs Compactos */}
                        <Card className="p-3 sm:p-4">
                          <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Status Rápido</h3>
                          <div className="space-y-1.5 sm:space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Pedidos Hoje</span>
                              <span className="font-bold text-sm sm:text-base">{totalOrders}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Em Rota</span>
                              <span className="font-bold text-sm sm:text-base text-amber-600">{inProgress}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Entregues</span>
                              <span className="font-bold text-sm sm:text-base text-green-600">{delivered}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Motoboys Ativos</span>
                              <span className="font-bold text-sm sm:text-base text-blue-600">{activeDrivers}</span>
                            </div>
                          </div>
                        </Card>

                        {/* Schedules dos Clientes */}
                        <Card className="p-3 sm:p-4">
                          <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3">📍 Clientes - Horários</h3>
                          <div className="space-y-2 max-h-[200px] sm:max-h-[240px] overflow-y-auto">
                            {clients.slice(0, 8).map((client) => {
                              const schedule = allClientSchedules.find(s => s.clientId === client.id);
                              return (
                                <div key={client.id} className="flex items-center justify-between py-1 border-b last:border-b-0">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{client.name}</p>
                                    {schedule && (
                                      <p className="text-[10px] text-muted-foreground">
                                        {schedule.horaAbertura} - {schedule.horaFechamento}
                                      </p>
                                    )}
                                  </div>
                                  <ClientStatusBadge clientId={client.id} schedules={allClientSchedules} />
                                </div>
                              );
                            })}
                          </div>
                        </Card>

                        {/* Schedules dos Motoboys */}
                        <Card className="p-4">
                          <h3 className="text-sm font-semibold mb-3">🏍️ Motoboys - Disponibilidade</h3>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {motoboys.slice(0, 6).map((motoboy) => {
                              const schedule = allMotoboySchedules.find(s => s.motoboyId === motoboy.id);
                              return (
                                <div key={motoboy.id} className="flex items-center justify-between py-1 border-b last:border-b-0">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{motoboy.name}</p>
                                    {schedule && (
                                      <p className="text-[10px] text-muted-foreground">
                                        {schedule.horaInicio} - {schedule.horaFim}
                                      </p>
                                    )}
                                  </div>
                                  <DriverAvailabilityBadge motoboyId={motoboy.id} />
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      </div>
                    </div>

                    {/* Atividade Recente - Compacta */}
                    <Card className="p-4 mb-6">
                      <h3 className="text-sm font-semibold mb-3">⚡ Últimos Pedidos</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {orders.slice(0, 6).map((order) => (
                          <div key={order.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold">
                                {order.status === 'pending' && '🆕'}
                                {order.status === 'in_progress' && '🚚'}
                                {order.status === 'delivered' && '✅'}
                                {' '}{order.clientName}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mb-1">
                              → {order.entregaBairro}
                            </p>
                            <p className="text-xs font-bold text-green-600">
                              R$ {((order.valor ? Number(order.valor) : 0) + (order.produtoValorTotal ? Number(order.produtoValorTotal) : 0)).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Chat Widget - Funcional e Organizado */}
                    {user && (
                      <Card className="p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">💬 Central de Comunicação</h3>
                          <Badge variant="outline" className="text-xs">
                            Tempo Real
                          </Badge>
                        </div>
                        <div className="h-[600px] border rounded-lg overflow-hidden bg-muted/20">
                          <ChatWidget
                            currentUserId={user.id}
                            currentUserName={user.name}
                            currentUserRole={user.role as 'client' | 'motoboy' | 'central'}
                            embedded={true}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                          💡 Gerencie conversas com clientes e motoboys em tempo real. 
                          Clique nas threads para ver o histórico completo de cada conversa.
                        </p>
                      </Card>
                    )}

                    {/* Insights Operacionais - Mantido mas mais compacto */}
                    <OperationalInsights 
                      clientSchedules={allClientSchedules}
                      motoboySchedules={allMotoboySchedules}
                      activeMotoboys={motoboys.length}
                    />
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
                      <h2 className="text-2xl font-bold">📦 Gestão de Pedidos</h2>
                    </div>

                    {/* Filtros Simplificados e Práticos */}
                    <Card className="p-4 mb-6">
                      <h3 className="text-sm font-semibold mb-3">🔍 Filtros</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                        {/* Filtro por Data */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Data</label>
                          <Input 
                            type="date" 
                            className="text-sm dark:text-foreground dark:bg-background dark:[color-scheme:dark]"
                            value={orderDateFilter}
                            onChange={(e) => setOrderDateFilter(e.target.value)}
                          />
                        </div>

                        {/* Filtro por Cliente */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Cliente</label>
                          <Select value={orderClientFilter} onValueChange={setOrderClientFilter}>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os clientes</SelectItem>
                              {clients.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Filtro por Motoboy */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Motoboy</label>
                          <Select value={orderMotoboyFilter} onValueChange={setOrderMotoboyFilter}>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os motoboys</SelectItem>
                              {motoboys.map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Filtro por Status */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                          <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="in_progress">Em Andamento</SelectItem>
                              <SelectItem value="delivered">Entregue</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Busca por texto */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Buscar</label>
                          <Input 
                            placeholder="Nome, bairro..."
                            className="text-sm"
                            value={orderSearchFilter}
                            onChange={(e) => setOrderSearchFilter(e.target.value)}
                          />
                        </div>
                      </div>
                    </Card>

                    {/* Tabela de Pedidos */}
                    <Card className="p-4">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr className="text-left">
                              <th className="p-3 text-xs font-semibold">Horário</th>
                              <th className="p-3 text-xs font-semibold">Cliente</th>
                              <th className="p-3 text-xs font-semibold">Motoboy</th>
                              <th className="p-3 text-xs font-semibold">Origem</th>
                              <th className="p-3 text-xs font-semibold">Destino</th>
                              <th className="p-3 text-xs font-semibold text-right">Valor</th>
                              <th className="p-3 text-xs font-semibold">Status</th>
                              <th className="p-3 text-xs font-semibold">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.filter(order => {
                              // Filtro de status
                              if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) return false;
                              // Filtro de cliente
                              if (orderClientFilter !== 'all' && order.clientId !== orderClientFilter) return false;
                              // Filtro de motoboy
                              if (orderMotoboyFilter !== 'all' && order.motoboyId !== orderMotoboyFilter) return false;
                              // Filtro de data
                              if (orderDateFilter) {
                                const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
                                if (orderDate !== orderDateFilter) return false;
                              }
                              // Filtro de busca textual
                              if (orderSearchFilter) {
                                const search = orderSearchFilter.toLowerCase();
                                const matchesClient = order.clientName?.toLowerCase().includes(search);
                                const matchesMotoboy = order.motoboyName?.toLowerCase().includes(search);
                                const matchesOrigin = order.coletaBairro?.toLowerCase().includes(search);
                                const matchesDest = order.entregaBairro?.toLowerCase().includes(search);
                                if (!matchesClient && !matchesMotoboy && !matchesOrigin && !matchesDest) return false;
                              }
                              return true;
                            }).map((order) => (
                              <tr key={order.id} className="border-b hover:bg-muted/50">
                                <td className="p-3 text-xs whitespace-nowrap">
                                  {new Date(order.createdAt).toLocaleString('pt-BR', { 
                                    day: '2-digit', 
                                    month: '2-digit',
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </td>
                                <td className="p-3 text-xs font-medium">{order.clientName}</td>
                                <td className="p-3 text-xs">{order.motoboyName || '-'}</td>
                                <td className="p-3 text-xs">{order.coletaBairro}</td>
                                <td className="p-3 text-xs">{order.entregaBairro}</td>
                                <td className="p-3 text-xs text-right font-semibold">
                                  R$ {((order.valor ? Number(order.valor) : 0) + (order.produtoValorTotal ? Number(order.produtoValorTotal) : 0)).toFixed(2)}
                                </td>
                                <td className="p-3">
                                  <span className={`text-[10px] px-2 py-1 rounded-full ${
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {order.status === 'pending' && 'Pendente'}
                                    {order.status === 'in_progress' && 'Em Rota'}
                                    {order.status === 'delivered' && 'Entregue'}
                                    {order.status === 'cancelled' && 'Cancelado'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex gap-1">
                                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                      <>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="text-xs h-7 px-2"
                                          onClick={() => {
                                            setSelectedOrderForReassign(order.id);
                                            setReassignDialogOpen(true);
                                          }}
                                        >
                                          Reatribuir
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="destructive"
                                          className="text-xs h-7 px-2"
                                          onClick={() => {
                                            if (confirm('Cancelar pedido?')) {
                                              cancelOrderMutation.mutate(order.id);
                                            }
                                          }}
                                        >
                                          Cancelar
                                        </Button>
                                      </>
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
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline" className="text-xs">
                          {allClientSchedules.length} horários carregados
                        </Badge>
                        <Button>
                          <Users className="w-4 h-4 mr-2" />
                          Novo Cliente
                        </Button>
                      </div>
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
                                // Filtra schedules deste cliente - garantir comparação de strings
                                const clientSchedules = allClientSchedules.filter(s => 
                                  String(s.clientId) === String(client.id)
                                );
                                
                                return (
                                  <tr key={client.id} className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">{client.name}</td>
                                    <td className="p-4">{client.phone}</td>
                                    <td className="p-4">{client.email}</td>
                                    <td className="p-4">
                                      <button
                                        title="Ver horários do cliente"
                                        onClick={() => {
                                          setSelectedClientForSchedule({ id: client.id, name: client.name });
                                          setClientScheduleDialogOpen(true);
                                        }}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                      >
                                        <ClientStatusBadge clientId={client.id} schedules={clientSchedules} />
                                      </button>
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
                      <h3 className="text-lg font-semibold mb-4">📅 Selecionar Período e Filtros</h3>
                      <div className="flex gap-4 items-end flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-sm font-medium mb-2">Data Inicial</label>
                          <Input 
                            type="date" 
                            className="dark:text-foreground dark:bg-background dark:[color-scheme:dark]"
                            value={finStartDate}
                            onChange={(e) => setFinStartDate(e.target.value)}
                          />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-sm font-medium mb-2">Data Final</label>
                          <Input 
                            type="date" 
                            className="dark:text-foreground dark:bg-background dark:[color-scheme:dark]"
                            value={finEndDate}
                            onChange={(e) => setFinEndDate(e.target.value)}
                          />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-sm font-medium mb-2">Motoboy</label>
                          <Select value={finMotoboyFilter} onValueChange={setFinMotoboyFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os motoboys</SelectItem>
                              {motoboys.map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-sm font-medium mb-2">Cliente</label>
                          <Select value={finClientFilter} onValueChange={setFinClientFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os clientes</SelectItem>
                              {clients.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button variant="outline" onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          setFinStartDate(today);
                          setFinEndDate(today);
                        }}>
                          Hoje
                        </Button>
                        <Button variant="outline" onClick={() => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          const yesterdayStr = yesterday.toISOString().split('T')[0];
                          setFinStartDate(yesterdayStr);
                          setFinEndDate(yesterdayStr);
                        }}>
                          Ontem
                        </Button>
                      </div>
                    </Card>

                    {/* Resumo Geral do Período */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      {(() => {
                        // Aplicar filtros
                        const deliveredOrders = orders.filter(o => {
                          if (o.status !== 'delivered') return false;
                          
                          // Filtro de data
                          const orderDate = new Date(o.deliveredAt || o.createdAt).toISOString().split('T')[0];
                          if (orderDate < finStartDate || orderDate > finEndDate) return false;
                          
                          // Filtro de motoboy
                          if (finMotoboyFilter !== 'all' && o.motoboyId !== finMotoboyFilter) return false;
                          
                          // Filtro de cliente
                          if (finClientFilter !== 'all' && o.clientId !== finClientFilter) return false;
                          
                          return true;
                        });
                        
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
                              // Agrupa pedidos por motoboy com filtros aplicados
                              const motoboyOrders = orders
                                .filter(o => {
                                  if (o.status !== 'delivered' || !o.motoboyId) return false;
                                  
                                  // Filtro de data
                                  const orderDate = new Date(o.deliveredAt || o.createdAt).toISOString().split('T')[0];
                                  if (orderDate < finStartDate || orderDate > finEndDate) return false;
                                  
                                  // Filtro de motoboy
                                  if (finMotoboyFilter !== 'all' && o.motoboyId !== finMotoboyFilter) return false;
                                  
                                  // Filtro de cliente
                                  if (finClientFilter !== 'all' && o.clientId !== finClientFilter) return false;
                                  
                                  return true;
                                })
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
                              // Agrupa pedidos por cliente com filtros aplicados
                              const clientOrders = orders
                                .filter(o => {
                                  if (o.status !== 'delivered' || !o.clientId) return false;
                                  
                                  // Filtro de data
                                  const orderDate = new Date(o.deliveredAt || o.createdAt).toISOString().split('T')[0];
                                  if (orderDate < finStartDate || orderDate > finEndDate) return false;
                                  
                                  // Filtro de motoboy
                                  if (finMotoboyFilter !== 'all' && o.motoboyId !== finMotoboyFilter) return false;
                                  
                                  // Filtro de cliente
                                  if (finClientFilter !== 'all' && o.clientId !== finClientFilter) return false;
                                  
                                  return true;
                                })
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
              schedules={allClientSchedules.filter(s => String(s.clientId) === String(selectedClientForSchedule.id))}
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