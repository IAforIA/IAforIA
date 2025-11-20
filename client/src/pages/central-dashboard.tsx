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
import { Package, TruckIcon, CheckCircle, Users, ExternalLink, UserCog, Shield, Ban, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function CentralDashboard() {
  // CONTEXTO GLOBAL: useAuth provê token JWT e função de logout
  const { logout, token, user } = useAuth();
  const { toast } = useToast();
  // ESTADO LOCAL: Guarda instância WebSocket para fechar ao desmontar
  const [ws, setWs] = useState<WebSocket | null>(null);

  // QUERY PRINCIPAL: Busca lista completa de pedidos (cacheado por React Query)
  const { data: orders = [], refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  // QUERY SECUNDÁRIA: Busca status online dos motoboys para indicadores
  const { data: motoboys = [] } = useQuery<Motoboy[]>({
    queryKey: ['/api/motoboys'],
  });

  // QUERY TERCIÁRIA: Busca lista de clientes para gestão
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    enabled: !!token, // Só faz a query se tiver token
  });

  // STEP 4: Query de usuários
  const { data: usersData = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: !!token,
  });

  // STEP 4: Mutation para alterar status de usuário
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string, status: string }) => {
      const res = await apiRequest('PATCH', `/api/users/${userId}/status`, { status });
      return res.json();
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

  // EFEITO: Abre conexão WebSocket autenticada para receber eventos em tempo real
  useEffect(() => {
    if (!token) return; // Sem token não conectamos

    const websocket = new WebSocket(resolveWebSocketUrl(token));

    // Quando chegar mensagem relevante, revalida cache de pedidos
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_order' || data.type === 'order_accepted' || data.type === 'order_delivered') {
        refetchOrders();
      }
    };

    websocket.onclose = () => console.log('WebSocket closed');
    websocket.onerror = (error) => console.error('WebSocket error:', error);
    websocket.onopen = () => console.log('WebSocket connected');

    // Guarda referência para eventual debug e encerra na limpeza do efeito
    setWs(websocket);
    return () => websocket.close();
  }, [refetchOrders, token]);

  // KPIs exibidos nos StatCards
  const totalOrders = orders.length;
  const inProgress = orders.filter(o => o.status === 'in_progress').length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const activeDrivers = motoboys.filter(m => m.online).length;

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

                    {/* Barra de busca local (futuro filtro de pedidos) */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <h2 className="text-lg font-semibold">Pedidos Recentes</h2>
                      <div className="flex gap-2 flex-1 max-w-md">
                        <Input
                          placeholder="Buscar pedidos..."
                          className="flex-1"
                          data-testid="input-search-orders"
                        />
                        <Button data-testid="button-search">Buscar</Button>
                      </div>
                    </div>

                    {/* Cards resumidos dos pedidos mais recentes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {orders.slice(0, 9).map((order) => (
                        <OrderCard
                          key={order.id}
                          id={order.id}
                          origin={`${order.coletaRua}, ${order.coletaNumero} - ${order.coletaBairro}`}
                          destination={`${order.entregaRua}, ${order.entregaNumero} - ${order.entregaBairro}`}
                          status={order.status as OrderStatus}
                          value={order.valor}
                          driverName={order.motoboyName || undefined}
                          onView={() => console.log('View order:', order.id)}
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
                            <div>
                              <p className="text-sm font-medium">
                                {order.status === 'pending' && 'Novo pedido criado'}
                                {order.status === 'in_progress' && 'Pedido em andamento'}
                                {order.status === 'delivered' && 'Entrega concluída'}
                              </p>
                              <p className="text-xs text-muted-foreground">Pedido #{order.id}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
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
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {order.status === 'pending' && 'Pendente'}
                                    {order.status === 'in_progress' && 'Em Andamento'}
                                    {order.status === 'delivered' && 'Entregue'}
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
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
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
                              <th className="text-left p-4 font-semibold">Pedidos</th>
                              <th className="text-left p-4 font-semibold">Cadastro</th>
                              <th className="text-left p-4 font-semibold">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clients.length === 0 ? (
                              <tr className="border-b">
                                <td className="p-4 text-muted-foreground text-center" colSpan={6}>
                                  Nenhum cliente cadastrado
                                </td>
                              </tr>
                            ) : (
                              clients.map(client => (
                                <tr key={client.id} className="border-b hover:bg-muted/50">
                                  <td className="p-4 font-medium">{client.name}</td>
                                  <td className="p-4">{client.phone}</td>
                                  <td className="p-4">{client.email}</td>
                                  <td className="p-4">
                                    {orders.filter(o => o.clientId === client.id).length}
                                  </td>
                                  <td className="p-4 text-sm">
                                    {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                                  </td>
                                  <td className="p-4">
                                    <Button variant="ghost" size="sm">Ver Pedidos</Button>
                                  </td>
                                </tr>
                              ))
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
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    motoboy.available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {motoboy.available ? 'Disponível' : 'Ocupado'}
                                  </span>
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

                {/* Sub-rota de Relatórios (path="/reports") */}
                <Route path="/reports">
                  <>
                    <h2 className="text-2xl font-bold mb-6">Relatórios e Análises</h2>

                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                        <p className="text-3xl font-bold mt-2">{orders.length}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Pedidos Entregues</p>
                        <p className="text-3xl font-bold mt-2">
                          {orders.filter(o => o.status === 'delivered').length}
                        </p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Em Andamento</p>
                        <p className="text-3xl font-bold mt-2">
                          {orders.filter(o => o.status === 'in_progress').length}
                        </p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Receita Total</p>
                        <p className="text-3xl font-bold mt-2">
                          R$ {orders.reduce((sum, o) => sum + parseFloat(o.valor), 0).toFixed(2)}
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
                                    {userData.status === 'ativo' ? (
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
                                        variant={userData.status === 'ativo' ? 'destructive' : 'default'}
                                        size="sm"
                                        onClick={() => {
                                          const newStatus = userData.status === 'ativo' ? 'inativo' : 'ativo';
                                          toggleUserStatusMutation.mutate({ userId: userData.id, status: newStatus });
                                        }}
                                      >
                                        {userData.status === 'ativo' ? (
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
                  <>
                    <h2 className="text-2xl font-bold mb-6">Configurações da Conta</h2>

                    <Card className="p-6 max-w-2xl">
                      <h3 className="text-lg font-semibold mb-4">Informações Pessoais</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Nome</label>
                          <Input placeholder="Seu nome completo" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Email</label>
                          <Input type="email" placeholder="seu@email.com" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Telefone</label>
                          <Input placeholder="(00) 00000-0000" />
                        </div>
                      </div>

                      <div className="border-t mt-6 pt-6">
                        <h3 className="text-lg font-semibold mb-4">Segurança</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Senha Atual</label>
                            <Input type="password" placeholder="••••••••" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Nova Senha</label>
                            <Input type="password" placeholder="••••••••" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Confirmar Nova Senha</label>
                            <Input type="password" placeholder="••••••••" />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-6">
                        <Button>Salvar Alterações</Button>
                        <Button variant="outline">Cancelar</Button>
                      </div>
                    </Card>
                  </>
                </Route>

                </Switch>
              </NestedRouter>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}