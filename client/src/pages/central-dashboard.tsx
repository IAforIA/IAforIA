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
import { Package, TruckIcon, CheckCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
// useQuery coordena chamadas REST com cache automático
import { useQuery } from "@tanstack/react-query";
// useAuth expõe token/logoff para proteger o painel
import { useAuth } from "@/App";
// Tipos compartilhados com o backend (Drizzle schema)
import type { Order, Motoboy, OrderStatus } from "@shared/schema";
import { useEffect, useState } from "react";
import { resolveWebSocketUrl } from "@/lib/utils";

export default function CentralDashboard() {
  // CONTEXTO GLOBAL: useAuth provê token JWT e função de logout
  const { logout, token } = useAuth();
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

                {/* Sub-rota de Pedidos (path="/orders") */}
                <Route path="/orders">
                  <Card className="p-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-semibold">Gestão de Pedidos</p>
                    <p className="text-muted-foreground mt-2">Funcionalidade de gestão avançada em desenvolvimento.</p>
                  </Card>
                </Route>

                {/* Sub-rota de Clientes (path="/clients") */}
                <Route path="/clients">
                  <Card className="p-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-semibold">Gestão de Clientes</p>
                    <p className="text-muted-foreground mt-2">Página de clientes em desenvolvimento.</p>
                  </Card>
                </Route>

                {/* Sub-rota de Entregadores (path="/drivers") */}
                <Route path="/drivers">
                  <Card className="p-12 text-center">
                    <TruckIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-semibold">Gestão de Entregadores</p>
                    <p className="text-muted-foreground mt-2">Página de entregadores em desenvolvimento.</p>
                  </Card>
                </Route>

                {/* Sub-rota de Relatórios (path="/reports") */}
                <Route path="/reports">
                  <Card className="p-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-semibold">Relatórios</p>
                    <p className="text-muted-foreground mt-2">Relatórios e análises em desenvolvimento.</p>
                  </Card>
                </Route>

                {/* Sub-rota de Configurações (path="/settings") */}
                <Route path="/settings">
                  <Card className="p-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-semibold">Configurações</p>
                    <p className="text-muted-foreground mt-2">Página de configurações em desenvolvimento.</p>
                  </Card>
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