import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
// IMPORTANTE: 'useLocation' removido, 'Switch' e 'Route' mantidos
import { Switch, Route } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
import StatCard from "@/components/StatCard";
import OrderCard from "@/components/OrderCard";
import { Package, TruckIcon, CheckCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/App";
import type { Order, Motoboy, OrderStatus } from "@shared/schema";
import { useEffect, useState } from "react";

export default function CentralDashboard() {
  const { logout, token } = useAuth();
  const [ws, setWs] = useState<WebSocket | null>(null);

  const { data: orders = [], refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: motoboys = [] } = useQuery<Motoboy[]>({
    queryKey: ['/api/motoboys'],
  });

  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const websocket = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_order' || data.type === 'order_accepted' || data.type === 'order_delivered') {
        refetchOrders();
      }
    };

    websocket.onclose = () => console.log('WebSocket closed');
    websocket.onerror = (error) => console.error('WebSocket error:', error);
    websocket.onopen = () => console.log('WebSocket connected');


    setWs(websocket);
    return () => websocket.close();
  }, [refetchOrders, token]);

  const totalOrders = orders.length;
  const inProgress = orders.filter(o => o.status === 'in_progress').length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const activeDrivers = motoboys.filter(m => m.online).length;

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
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

              {/* CORREÇÃO FINAL: Os caminhos agora são relativos (sem /central) */}
              <Switch>
                {/* Rota Principal do Dashboard (path="/") */}
                <Route path="/">
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <StatCard title="Total Pedidos" value={totalOrders} icon={Package} />
                      <StatCard title="Em Andamento" value={inProgress} icon={TruckIcon} />
                      <StatCard title="Concluídos" value={delivered} icon={CheckCircle} />
                      <StatCard title="Entregadores Ativos" value={activeDrivers} icon={Users} />
                    </div>

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

                    {orders.length === 0 && (
                      <Card className="p-12 text-center">
                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">Nenhum pedido cadastrado</p>
                      </Card>
                    )}

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
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}