import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import StatCard from "@/components/StatCard";
import OrderCard from "@/components/OrderCard";
import { Package, TruckIcon, CheckCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

//todo: remove mock functionality
const mockOrders = [
  {
    id: "2024-001",
    origin: "Rua das Flores, 123 - Centro",
    destination: "Av. Principal, 456 - Bairro Norte",
    status: "pending" as const,
    value: "45.00",
  },
  {
    id: "2024-002",
    origin: "Shopping Center - Loja 201",
    destination: "Condomínio Residencial, Bloco A",
    status: "in_progress" as const,
    value: "78.50",
    driverName: "João Silva",
  },
  {
    id: "2024-003",
    origin: "Empresa XYZ Ltda",
    destination: "Cliente ABC - Escritório 5",
    status: "delivered" as const,
    value: "125.00",
    driverName: "Maria Santos",
  },
  {
    id: "2024-004",
    origin: "Armazém Central",
    destination: "Loja Parceira - Unidade 3",
    status: "in_progress" as const,
    value: "95.00",
    driverName: "Pedro Costa",
  },
];

export default function CentralDashboard() {
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
            <ThemeToggle />
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Pedidos" value="156" icon={Package} />
                <StatCard title="Em Andamento" value="23" icon={TruckIcon} />
                <StatCard title="Concluídos" value="128" icon={CheckCircle} />
                <StatCard title="Entregadores Ativos" value="12" icon={Users} />
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
                {mockOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    {...order}
                    onView={() => console.log('View order:', order.id)}
                  />
                ))}
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Atividade Recente</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm font-medium">Novo pedido criado</p>
                      <p className="text-xs text-muted-foreground">Cliente: Empresa ABC</p>
                    </div>
                    <span className="text-xs text-muted-foreground">2 min atrás</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm font-medium">Entrega concluída</p>
                      <p className="text-xs text-muted-foreground">Pedido #2024-001</p>
                    </div>
                    <span className="text-xs text-muted-foreground">15 min atrás</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">Novo entregador cadastrado</p>
                      <p className="text-xs text-muted-foreground">Carlos Oliveira</p>
                    </div>
                    <span className="text-xs text-muted-foreground">1 hora atrás</span>
                  </div>
                </div>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
