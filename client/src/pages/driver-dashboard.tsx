import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
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
import type { Order } from "@shared/schema";

export default function DriverDashboard() {
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const { data: orders = [], refetch } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const availableOrders = orders.filter(o => o.status === 'pending');
  const myOrders = orders.filter(o => o.motoboyId === user?.id && o.status === 'in_progress');
  const deliveredToday = orders.filter(o => 
    o.motoboyId === user?.id && 
    o.status === 'delivered' &&
    new Date(o.deliveredAt!).toDateString() === new Date().toDateString()
  );

  const totalEarnings = deliveredToday.reduce((sum, o) => sum + parseFloat(o.valor), 0);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const websocket = new WebSocket(`${protocol}//${window.location.host}/ws?id=${user?.id}`);
    
    websocket.onmessage = () => refetch();
    
    return () => websocket.close();
  }, [user?.id, refetch]);

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Entregas Hoje" value={deliveredToday.length} icon={Package} />
                <StatCard title="Em Andamento" value={myOrders.length} icon={TruckIcon} />
                <StatCard title="Concluídas" value={deliveredToday.length} icon={CheckCircle} />
                <StatCard title="Ganhos Hoje" value={`R$ ${totalEarnings.toFixed(2)}`} icon={DollarSign} />
              </div>

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
                          status={order.status as any}
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
                          status={order.status as any}
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
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
