import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import StatCard from "@/components/StatCard";
import OrderCard from "@/components/OrderCard";
import { Package, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/App";
import type { Order } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const orderSchema = z.object({
  coletaRua: z.string().min(3, "Rua é obrigatória"),
  coletaNumero: z.string().min(1, "Número é obrigatório"),
  coletaBairro: z.string().min(3, "Bairro é obrigatório"),
  coletaCep: z.string().default("29900-000"),
  entregaRua: z.string().min(3, "Rua é obrigatória"),
  entregaNumero: z.string().min(1, "Número é obrigatório"),
  entregaBairro: z.string().min(3, "Bairro é obrigatório"),
  entregaCep: z.string().default("29900-000"),
  valor: z.string().min(1, "Valor é obrigatório"),
  taxaMotoboy: z.string().default("7.00"),
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function ClientDashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const { data: orders = [], refetch } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const clientOrders = orders.filter(o => o.clientId === user?.id);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const websocket = new WebSocket(`${protocol}//${window.location.host}/ws?id=${user?.id}`);
    
    websocket.onmessage = () => refetch();
    
    return () => websocket.close();
  }, [user?.id, refetch]);

  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const res = await apiRequest('POST', '/api/orders', {
        clientId: user?.id,
        clientName: user?.name,
        clientPhone: '27988888888',
        ...data,
        coletaComplemento: '',
        entregaComplemento: '',
        formaPagamento: 'dinheiro',
        hasTroco: false,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Pedido criado com sucesso!",
        description: "Seu pedido foi enviado e está aguardando um entregador.",
      });
      setIsDialogOpen(false);
    },
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      coletaRua: "",
      coletaNumero: "",
      coletaBairro: "",
      coletaCep: "29900-000",
      entregaRua: "",
      entregaNumero: "",
      entregaBairro: "",
      entregaCep: "29900-000",
      valor: "7.00",
      taxaMotoboy: "7.00",
    },
  });

  const totalOrders = clientOrders.length;
  const pending = clientOrders.filter(o => o.status === 'pending').length;
  const delivered = clientOrders.filter(o => o.status === 'delivered').length;
  const cancelled = clientOrders.filter(o => o.status === 'cancelled').length;

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
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
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Pedido</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => createOrderMutation.mutate(data))} className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold">Coleta</h3>
                        <FormField control={form.control} name="coletaRua" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rua</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Rua da Coleta" data-testid="input-coleta-rua" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="coletaNumero" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="123" data-testid="input-coleta-numero" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="coletaBairro" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bairro</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Centro" data-testid="input-coleta-bairro" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-semibold">Entrega</h3>
                        <FormField control={form.control} name="entregaRua" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rua</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Rua da Entrega" data-testid="input-entrega-rua" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="entregaNumero" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="456" data-testid="input-entrega-numero" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="entregaBairro" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bairro</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Praia" data-testid="input-entrega-bairro" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={form.control} name="valor" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor (R$)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="7.00" data-testid="input-valor" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <Button type="submit" className="w-full" disabled={createOrderMutation.isPending} data-testid="button-submit-order">
                        {createOrderMutation.isPending ? "Criando..." : "Criar Pedido"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <ThemeToggle />
              <Button variant="outline" onClick={logout} data-testid="button-logout">Sair</Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total de Pedidos" value={totalOrders} icon={Package} />
                <StatCard title="Pendentes" value={pending} icon={Clock} />
                <StatCard title="Concluídos" value={delivered} icon={CheckCircle} />
                <StatCard title="Cancelados" value={cancelled} icon={XCircle} />
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Pedidos Ativos</h2>
                {clientOrders.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Você ainda não tem pedidos. Clique em "Novo Pedido" para começar.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clientOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        id={order.id}
                        origin={`${order.coletaRua}, ${order.coletaNumero} - ${order.coletaBairro}`}
                        destination={`${order.entregaRua}, ${order.entregaNumero} - ${order.entregaBairro}`}
                        status={order.status as any}
                        value={order.valor}
                        driverName={order.motoboyName || undefined}
                        onView={() => console.log('View order:', order.id)}
                      />
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
