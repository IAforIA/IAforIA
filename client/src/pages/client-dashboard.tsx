import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import StatCard from "@/components/StatCard";
import OrderCard from "@/components/OrderCard";
import OrderForm from "@/components/OrderForm";
import { Package, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

//todo: remove mock functionality
const mockOrders = [
  {
    id: "2024-005",
    origin: "Minha Empresa - Depósito",
    destination: "Cliente Final - Rua A, 100",
    status: "pending" as const,
    value: "55.00",
  },
  {
    id: "2024-006",
    origin: "Escritório Principal",
    destination: "Filial Norte",
    status: "in_progress" as const,
    value: "88.00",
    driverName: "Ana Lima",
  },
  {
    id: "2024-007",
    origin: "Centro de Distribuição",
    destination: "Parceiro Comercial",
    status: "delivered" as const,
    value: "120.00",
    driverName: "Roberto Alves",
  },
];

export default function ClientDashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  const handleOrderSubmit = (data: any) => {
    console.log('New order:', data);
    toast({
      title: "Pedido criado com sucesso!",
      description: "Seu pedido foi enviado e está aguardando um entregador.",
    });
    setIsDialogOpen(false);
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar role="client" />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-semibold" data-testid="text-page-title">Meus Pedidos</h1>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-order">Novo Pedido</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Pedido</DialogTitle>
                  </DialogHeader>
                  <OrderForm onSubmit={handleOrderSubmit} />
                </DialogContent>
              </Dialog>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total de Pedidos" value="47" icon={Package} />
                <StatCard title="Pendentes" value="8" icon={Clock} />
                <StatCard title="Concluídos" value="38" icon={CheckCircle} />
                <StatCard title="Cancelados" value="1" icon={XCircle} />
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Pedidos Ativos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mockOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      {...order}
                      onView={() => console.log('View order:', order.id)}
                    />
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
