import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
// IMPORTANTE: 'useLocation' removido, 'Switch' e 'Route' mantidos
import { Switch, Route } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
import StatCard from "@/components/StatCard";
import OrderCard from "@/components/OrderCard";
import { TruckIcon, Package, CheckCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/App";
import type { Order, OrderStatus } from "@shared/schema";

const parseDecimalSafe = (value: string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

export default function DriverDashboard() {
  const { toast } = useToast();
  const { user, logout, token } = useAuth();

  const { data: orders = [], refetch } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const availableOrders = orders.filter(o => o.status === 'pending');
  const myOrders = orders.filter(o => o.motoboyId === user?.id && o.status === 'in_progress');
  const deliveredToday = orders.filter(o =>
    o.motoboyId === user?.id &&
    o.status === 'delivered' &&
    o.deliveredAt && new Date(o.deliveredAt).toDateString() === new Date().toDateString()
  );

  const totalEarnings = deliveredToday.reduce((sum, o) => sum + parseDecimalSafe(o.taxaMotoboy), 0);

  useEffect(() => {
    if (!user?.id || !token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const websocket = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`);

    websocket.onmessage = () => refetch();

    return () => websocket.close();
  }, [user?.id, refetch, token]);

  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest('POST', `/api/orders/${orderId}/accept`, {
        motoboyId: user?.id,
        motoboyName: user?.name,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Entrega aceita!",
        description: "O pedido foi adicionado às suas entregas.",
      });
    },
  });

  const deliverOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest('POST', `/api/orders/${orderId}/deliver`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Entrega concluída!",
        description: "O pedido foi marcado como entregue.",
      });
    },
  });

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  // Criamos componentes para o conteúdo das rotas para organizar o <Switch>
  const DashboardContent = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Entregas Hoje" value={deliveredToday.length} icon={Package} />
        <StatCard title="Em Andamento" value={myOrders.length} icon={TruckIcon} />
        <StatCard title="Concluídas" value={deliveredToday.length} icon={CheckCircle} />
        <StatCard title="Ganhos Hoje" value={`R$ ${totalEarnings.toFixed(2)}`} icon={DollarSign} />
      </div>
      <AvailableDeliveries />
      <MyDeliveries />
    </>
  );

  const AvailableDeliveries = () => (
    <div>
      <h2 className="text-lg font-semibold mb-4">Entregas Disponíveis</h2>
      {availableOrders.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma entrega disponível no momento</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableOrders.map((order) => (
            <Card key={order.id} className="p-4">
              <OrderCard
                id={order.id}
                origin={`${order.coletaRua}, ${order.coletaNumero} - ${order.coletaBairro}`}
                destination={`${order.entregaRua}, ${order.entregaNumero} - ${order.entregaBairro}`}
                status={order.status as OrderStatus}
                value={order.valor}
              />
              <Button
                className="w-full mt-4"
                onClick={() => acceptOrderMutation.mutate(order.id)}
                disabled={acceptOrderMutation.isPending}
                data-testid={`button-accept-${order.id}`}
              >
                Aceitar Entrega
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const MyDeliveries = () => (
    <div>
      <h2 className="text-lg font-semibold mb-4">Minhas Entregas Ativas</h2>
      {myOrders.length === 0 ? (
        <Card className="p-12 text-center">
          <TruckIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Você não tem entregas ativas. Aceite uma entrega para começar.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myOrders.map((order) => (
            <Card key={order.id} className="p-4">
              <OrderCard
                id={order.id}
                origin={`${order.coletaRua}, ${order.coletaNumero} - ${order.coletaBairro}`}
                destination={`${order.entregaRua}, ${order.entregaNumero} - ${order.entregaBairro}`}
                status={order.status as OrderStatus}
                value={order.valor}
              />
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => deliverOrderMutation.mutate(order.id)}
                disabled={deliverOrderMutation.isPending}
                data-testid={`button-complete-${order.id}`}
              >
                Marcar como Entregue
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );


  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar role="driver" />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-semibold" data-testid="text-page-title">Dashboard do Entregador</h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-green-500 text-white" data-testid="badge-status">Disponível</Badge>
              <ThemeToggle />
              <Button variant="outline" onClick={logout} data-testid="button-logout">Sair</Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">

              {/* CORREÇÃO FINAL: Os caminhos agora são relativos (sem /driver) */}
              <Switch>
                {/* Rota Principal (path="/") */}
                <Route path="/" component={DashboardContent} />

                {/* Sub-rota de Entregas Disponíveis (path="/available") */}
                <Route path="/available" component={AvailableDeliveries} />

                {/* Sub-rota de Minhas Entregas (path="/my-deliveries") */}
                <Route path="/my-deliveries" component={MyDeliveries} />

                {/* Sub-rota de Histórico (path="/history") */}
                <Route path="/history">
                  <Card className="p-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-semibold">Histórico de Entregas</p>
                    <p className="text-muted-foreground mt-2">Em breve você poderá ver todo seu histórico aqui.</p>
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