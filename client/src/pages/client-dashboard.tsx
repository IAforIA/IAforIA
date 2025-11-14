import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useLocation } from "wouter";
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
import type { Order, OrderStatus } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// Esquema Zod corrigido: Usando números para valores monetários
const orderSchema = z.object({
  coletaRua: z.string().min(3, "Rua é obrigatória"),
  coletaNumero: z.string().min(1, "Número é obrigatório"),
  coletaBairro: z.string().min(3, "Bairro é obrigatório"),
  coletaCep: z.string().default("29900-000"),
  entregaRua: z.string().min(3, "Rua é obrigatória"),
  entregaNumero: z.string().min(1, "Número é obrigatório"),
  entregaBairro: z.string().min(3, "Bairro é obrigatório"),
  entregaCep: z.string().default("29900-000"),
  valor: z.number().min(0.01, "Valor é obrigatório"), // Alterado para number
  taxaMotoboy: z.number().default(7.00), // Alterado para number
  // Adicionar campos faltantes que estavam hardcoded, se necessário no formulário
  // formaPagamento: z.string().default("dinheiro"), 
});

// Tipo derivado do novo esquema
type OrderFormData = z.infer<typeof orderSchema>;

export default function ClientDashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [location] = useLocation();
  const { toast } = useToast();
  const { user, logout, token } = useAuth(); 

  const { data: orders = [], refetch } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const clientOrders = orders.filter(o => o.clientId === user?.id);

  useEffect(() => {
    // CRÍTICO: Autenticação segura via token no WS
    if (!user?.id || !token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const websocket = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`);

    websocket.onmessage = () => refetch();

    return () => websocket.close();
  }, [user?.id, refetch, token]); // Adicionado token como dependência

  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      // CORRIGIDO: Convertendo number para string ANTES de enviar para a API, 
      // pois o schema Drizzle espera string/decimal.
      const res = await apiRequest('POST', '/api/orders', {
        clientId: user?.id,
        clientName: user?.name,
        clientPhone: user?.phone || 'N/A', // Usa o telefone do usuário logado, não hardcode
        ...data,
        valor: data.valor.toFixed(2), // Converte para string com 2 casas decimais
        taxaMotoboy: data.taxaMotoboy.toFixed(2), // Converte para string com 2 casas decimais
        // Mantém hardcoded temporariamente até adicionar ao formulário/backend
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
      form.reset(); // Reseta o formulário após sucesso
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
      valor: 7.00, // Default value as number
      taxaMotoboy: 7.00, // Default value as number
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

                      {/* Campos de Valor e Taxa (Ajustados para aceitar números na UI) */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="valor" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor do Pedido (R$)</FormLabel>
                            <FormControl>
                              {/* Use type="number" para melhor UX no mobile */}
                              <Input {...field} type="number" step="0.01" placeholder="7.00" 
                                onChange={e => field.onChange(parseFloat(e.target.value))} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="taxaMotoboy" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sua Taxa (R$)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="7.00" 
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <Button type="submit" className="w-full" disabled={createOrderMutation.isPending} data-testid="button-submit-order">
                        {createOrderMutation.isPending ? "Criando Pedido..." : "Criar Pedido"}
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
              {(location === "/client" || location === "/client/orders") && (
              <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Pedidos" value={totalOrders} icon={Package} />
                <StatCard title="Aguardando" value={pending} icon={Clock} />
                <StatCard title="Concluídos" value={delivered} icon={CheckCircle} />
                <StatCard title="Cancelados" value={cancelled} icon={XCircle} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clientOrders.slice(0, 9).map((order) => (
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

              {clientOrders.length === 0 && (
                <Card className="p-12 text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum pedido criado ainda</p>
                </Card>
              )}
              </>
              )}

              {location === "/client/history" && (
                <Card className="p-12 text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-lg font-semibold">Histórico Completo</p>
                  <p className="text-muted-foreground mt-2">Em breve você verá todo seu histórico de pedidos aqui.</p>
                </Card>
              )}

              {location === "/client/settings" && (
                <Card className="p-12 text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-lg font-semibold">Configurações</p>
                  <p className="text-muted-foreground mt-2">Página de configurações em desenvolvimento.</p>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
