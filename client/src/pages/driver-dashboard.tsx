import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import StatCard from "@/components/StatCard";
import OrderCard from "@/components/OrderCard";
import { TruckIcon, Package, CheckCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

//todo: remove mock functionality
const mockAvailableOrders = [
  {
    id: "2024-010",
    origin: "Shopping Center - Loja 305",
    destination: "Residencial Park - Bloco C",
    status: "pending" as const,
    value: "65.00",
  },
  {
    id: "2024-011",
    origin: "Restaurante Bom Sabor",
    destination: "Empresa Tech Solutions",
    status: "pending" as const,
    value: "42.00",
  },
];

const mockMyDeliveries = [
  {
    id: "2024-008",
    origin: "Centro Comercial",
    destination: "Av. das Américas, 500",
    status: "in_progress" as const,
    value: "75.00",
  },
  {
    id: "2024-009",
    origin: "Loja Virtual Hub",
    destination: "Condomínio Vila Real",
    status: "in_progress" as const,
    value: "58.00",
  },
];

export default function DriverDashboard() {
  const [availableOrders, setAvailableOrders] = useState(mockAvailableOrders);
  const { toast } = useToast();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  const handleAcceptOrder = (orderId: string) => {
    console.log('Accept order:', orderId);
    setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
    toast({
      title: "Entrega aceita!",
      description: `Pedido #${orderId} foi adicionado às suas entregas.`,
    });
  };

  const handleCompleteDelivery = (orderId: string) => {
    console.log('Complete delivery:', orderId);
    toast({
      title: "Entrega concluída!",
      description: `Pedido #${orderId} foi marcado como entregue.`,
    });
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
              <Badge className="bg-green-500 text-white">Disponível</Badge>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Entregas Hoje" value="8" icon={Package} />
                <StatCard title="Em Andamento" value="2" icon={TruckIcon} />
                <StatCard title="Concluídas" value="6" icon={CheckCircle} />
                <StatCard title="Ganhos Hoje" value="R$ 385" icon={DollarSign} />
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
                        <OrderCard {...order} />
                        <Button 
                          className="w-full mt-4" 
                          onClick={() => handleAcceptOrder(order.id)}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mockMyDeliveries.map((order) => (
                    <Card key={order.id} className="p-4">
                      <OrderCard {...order} />
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={() => handleCompleteDelivery(order.id)}
                        data-testid={`button-complete-${order.id}`}
                      >
                        Marcar como Entregue
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
