/**
 * ARQUIVO: client/src/pages/client-dashboard.tsx
 * PROPÓSITO: Dashboard do cliente - criar pedidos, acompanhar status, histórico
 * 
 * TECNOLOGIAS:
 * - React 18.3.1 + TypeScript
 * - React Hook Form + Zod (validação formulário)
 * - React Query (cache, mutations, invalidation)
 * - WebSocket (atualizações em tempo real)
 * - shadcn/ui (componentes acessíveis)
 * - Wouter (roteamento client-side)
 * 
 * FUNCIONALIDADES:
 * - Etapa 05: Cadastro inicial de clientes PF/PJ
 * - Etapa 06: Auto-fill de endereço de coleta do perfil
 * - WebSocket: Escuta eventos de atualização de pedidos
 * - Stats: Contadores de pedidos por status
 * - Histórico: Grid com todos os pedidos do cliente
 * 
 * PADRÕES REACT:
 * - Custom Hooks: useAuth (contexto de autenticação), useToast (notificações)
 * - Controlled Forms: React Hook Form gerencia estado do formulário
 * - Optimistic Updates: Invalidação de cache após mutação (queryClient.invalidateQueries)
 * - Component Composition: DashboardContent reutilizado em múltiplas rotas
 */

// Layout base com sidebar responsiva
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
// Roteamento local (clientes também têm subrotas)
import { Switch as RouterSwitch, Route, Router as NestedRouter } from "wouter";
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
import type { ClientProfileDto } from "@shared/contracts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch as UiSwitch } from "@/components/ui/switch"; // Renomeado para evitar conflito com Wouter
import { resolveWebSocketUrl } from "@/lib/utils";

// ========================================
// VALIDAÇÃO: SCHEMA ZOD DO FORMULÁRIO
// ========================================
/**
 * SCHEMA: orderSchema
 * PROPÓSITO: Validação client-side de campos do pedido
 * PADRÃO: Schema Composition - reflete subset de insertOrderSchema (backend)
 * 
 * CAMPOS:
 * - Coleta: rua, numero, bairro, cep (auto-filled se override=false)
 * - Entrega: rua, numero, bairro, cep (sempre manual)
 * - Valores: valor (total), taxaMotoboy (padrão 7.00)
 * - Override: coletaOverride (boolean, controla auto-fill)
 * 
 * VALIDAÇÃO:
 * - min(3): strings devem ter 3+ caracteres
 * - min(0.01): valor mínimo R$ 0,01
 * - default(): valores padrão quando campo omitido
 */
const orderSchema = z.object({
  coletaRua: z.string().min(3, "Rua é obrigatória"),
  coletaNumero: z.string().min(1, "Número é obrigatório"),
  coletaBairro: z.string().min(3, "Bairro é obrigatório"),
  coletaCep: z.string().default("29900-000"),
  coletaOverride: z.boolean().default(false), // Etapa 06: toggle auto-fill
  entregaRua: z.string().min(3, "Rua é obrigatória"),
  entregaNumero: z.string().min(1, "Número é obrigatório"),
  entregaBairro: z.string().min(3, "Bairro é obrigatório"),
  entregaCep: z.string().default("29900-000"),
  valor: z.number().min(0.01, "Valor é obrigatório"),
  taxaMotoboy: z.number().default(7.00),
});

// TYPE INFERENCE: Extrai tipo TypeScript do schema Zod
type OrderFormData = z.infer<typeof orderSchema>;

// ========================================
// COMPONENTE AUXILIAR: DASHBOARD CONTENT
// ========================================
/**
 * COMPONENTE: DashboardContent
 * PROPÓSITO: Renderiza stats + grid de pedidos (reutilizado em múltiplas rotas)
 * PADRÃO: Presentational Component - recebe props, não gerencia estado
 */
const DashboardContent = ({ clientOrders, totalOrders, pending, delivered, cancelled }: any) => (
  <>
    {/* Indicadores principais (StatCard) */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard title="Total Pedidos" value={totalOrders} icon={Package} />
      <StatCard title="Aguardando" value={pending} icon={Clock} />
      <StatCard title="Concluídos" value={delivered} icon={CheckCircle} />
      <StatCard title="Cancelados" value={cancelled} icon={XCircle} />
    </div>

    {/* Cards de pedidos mais recentes do cliente */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {clientOrders.slice(0, 9).map((order: Order) => (
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

    {/* Empty state amigável quando ainda não existem pedidos */}
    {clientOrders.length === 0 && (
      <Card className="p-12 text-center">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Nenhum pedido criado ainda</p>
      </Card>
    )}
  </>
);

export default function ClientDashboard() {
  // UI STATE: controla abertura do modal "Novo Pedido"
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [profileWarningShown, setProfileWarningShown] = useState(false);
  const { toast } = useToast();
  // CONTEXTO GLOBAL: user (id/nome), logout e token JWT
  const { user, logout, token } = useAuth();

  // QUERY BASE: busca todos os pedidos (centralizada – cliente filtra localmente)
  const { data: orders = [], refetch } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: profile, isPending: isProfileLoading } = useQuery<ClientProfileDto>({
    queryKey: ['/api/me/profile'],
    enabled: Boolean(user?.id),
    retry: false,
  });

  // FILTRO LOCAL: garante que cliente veja apenas seus próprios pedidos
  const clientOrders = orders.filter(o => o.clientId === user?.id);

  // EFEITO: WebSocket autenticado para receber atualizações instantâneas
  useEffect(() => {
    if (!user?.id || !token) return;

    const websocket = new WebSocket(resolveWebSocketUrl(token));

    websocket.onmessage = () => refetch();

    return () => websocket.close();
  }, [user?.id, refetch, token]);

  // MUTATION: envia POST /api/orders com dados do formulário
  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const res = await apiRequest('POST', '/api/orders', {
        clientId: user?.id,
        clientName: profile?.name ?? user?.name,
        clientPhone: profile?.phone ?? user?.phone ?? 'N/A',
        ...data,
        coletaCep: data.coletaCep,
        coletaOverride: data.coletaOverride,
        valor: data.valor.toFixed(2),
        taxaMotoboy: data.taxaMotoboy.toFixed(2),
        entregaComplemento: '',
        formaPagamento: 'dinheiro',
        hasTroco: false,
      });
      return await res.json();
    },
    onSuccess: () => {
      // Revalida cache de pedidos e dá feedback para o cliente
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Pedido criado com sucesso!",
        description: "Seu pedido foi enviado e está aguardando um entregador.",
      });
      setIsDialogOpen(false);
      form.reset({
        coletaRua: profile?.address.rua ?? '',
        coletaNumero: profile?.address.numero ?? '',
        coletaBairro: profile?.address.bairro ?? '',
        coletaCep: profile?.address.cep ?? '29900-000',
        coletaOverride: false,
        entregaRua: '',
        entregaNumero: '',
        entregaBairro: '',
        entregaCep: '29900-000',
        valor: 7.00,
        taxaMotoboy: 7.00,
      });
    },
  });

  // FORM: React Hook Form + Zod, com defaults amigáveis
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      coletaRua: "",
      coletaNumero: "",
      coletaBairro: "",
      coletaCep: "29900-000",
      coletaOverride: false,
      entregaRua: "",
      entregaNumero: "",
      entregaBairro: "",
      entregaCep: "29900-000",
      valor: 7.00,
      taxaMotoboy: 7.00,
    },
  });

  const overrideEnabled = form.watch('coletaOverride');
  const isColetaLocked = !overrideEnabled;

  useEffect(() => {
    if (!profile) return;
    if (overrideEnabled) return;

    form.setValue('coletaRua', profile.address.rua, { shouldDirty: false });
    form.setValue('coletaNumero', profile.address.numero, { shouldDirty: false });
    form.setValue('coletaBairro', profile.address.bairro, { shouldDirty: false });
    form.setValue('coletaCep', profile.address.cep, { shouldDirty: false });
  }, [profile, overrideEnabled, form]);

  useEffect(() => {
    if (user?.role !== 'client') return;
    if (isProfileLoading) return;

    if (!profile && !profileWarningShown) {
      toast({
        title: "Não encontramos seu endereço fixo",
        description: "Finalize o cadastro PF/PJ ou fale com a central para atualizar o endereço antes de criar pedidos.",
        variant: "destructive",
      });
      setProfileWarningShown(true);
    }

    if (profile && profileWarningShown) {
      setProfileWarningShown(false);
    }
  }, [isProfileLoading, profile, toast, user?.role, profileWarningShown]);

  // KPIs do cliente
  const totalOrders = clientOrders.length;
  const pending = clientOrders.filter(o => o.status === 'pending').length;
  const delivered = clientOrders.filter(o => o.status === 'delivered').length;
  const cancelled = clientOrders.filter(o => o.status === 'cancelled').length;

  // Custom properties para largura do sidebar
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        {/* Sidebar com navegação específica do cliente */}
        <AppSidebar role="client" />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-semibold" data-testid="text-page-title">Meus Pedidos</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Modal controlado para criação de pedidos */}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    data-testid="button-new-order"
                    disabled={isProfileLoading || !profile}
                    title={isProfileLoading ? "Carregando endereço fixo" : (!profile ? "Finalize seu cadastro para liberar pedidos" : undefined)}
                  >
                    Novo Pedido
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Pedido</DialogTitle>
                  </DialogHeader>
                  {/* Form provider injeta RHF context para todos os FormField */}
                  {isProfileLoading && (
                    <p className="text-sm text-muted-foreground">Carregando endereço fixo cadastrado...</p>
                  )}
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => createOrderMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="coletaOverride"
                        render={({ field }) => (
                          <FormItem className="space-y-2 rounded-lg border border-border p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <FormLabel className="text-base">Endereço de coleta automatizado</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  {profile
                                    ? `${profile.address.rua}, ${profile.address.numero} - ${profile.address.bairro}`
                                    : "Carregando endereço fixo cadastrado..."}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Desative apenas em emergências para informar um endereço diferente neste pedido.
                                </p>
                              </div>
                              <FormControl>
                                <UiSwitch
                                  checked={field.value}
                                  onCheckedChange={(checked: boolean) => {
                                    field.onChange(checked);
                                    if (!checked && profile) {
                                      form.setValue('coletaRua', profile.address.rua, { shouldDirty: false });
                                      form.setValue('coletaNumero', profile.address.numero, { shouldDirty: false });
                                      form.setValue('coletaBairro', profile.address.bairro, { shouldDirty: false });
                                      form.setValue('coletaCep', profile.address.cep, { shouldDirty: false });
                                    }
                                  }}
                                  disabled={isProfileLoading || !profile}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Bloco 1: endereço de coleta */}
                      <div className="space-y-2">
                        <h3 className="font-semibold">Coleta</h3>
                        <FormField control={form.control} name="coletaRua" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rua</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Rua da Coleta"
                                data-testid="input-coleta-rua"
                                readOnly={isColetaLocked}
                                aria-readonly={isColetaLocked}
                                className={isColetaLocked ? "bg-muted" : undefined}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="coletaNumero" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="123"
                                data-testid="input-coleta-numero"
                                readOnly={isColetaLocked}
                                aria-readonly={isColetaLocked}
                                className={isColetaLocked ? "bg-muted" : undefined}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="coletaBairro" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bairro</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Centro"
                                data-testid="input-coleta-bairro"
                                readOnly={isColetaLocked}
                                aria-readonly={isColetaLocked}
                                className={isColetaLocked ? "bg-muted" : undefined}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="coletaCep" render={({ field }) => (
                          <FormItem>
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="00000-000"
                                data-testid="input-coleta-cep"
                                readOnly={isColetaLocked}
                                aria-readonly={isColetaLocked}
                                className={isColetaLocked ? "bg-muted" : undefined}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {/* Bloco 2: endereço de entrega */}
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

                      {/* Bloco 3: valores financeiros (convertem string -> number) */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="valor" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor do Pedido (R$)</FormLabel>
                            <FormControl>
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

                      {/* Submit bloqueia enquanto mutation roda para evitar duplicidade */}
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createOrderMutation.isPending || isProfileLoading || !profile}
                        data-testid="button-submit-order"
                      >
                        {createOrderMutation.isPending ? "Criando Pedido..." : "Criar Pedido"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              {/* Preferência de tema por usuário */}
              <ThemeToggle />
              <Button variant="outline" onClick={logout} data-testid="button-logout">Sair</Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* NestedRouter limita escopo das rotas ao /client */}
              <NestedRouter base="/client">
                <RouterSwitch>
                {/* Rota Principal (path="/") reusa DashboardContent */}
                <Route path="/">
                  <DashboardContent clientOrders={clientOrders} totalOrders={totalOrders} pending={pending} delivered={delivered} cancelled={cancelled} />
                </Route>

                {/* Rota de Pedidos (path="/orders") mantém mesma listagem para breadcrumbs futuros */}
                <Route path="/orders">
                  <DashboardContent clientOrders={clientOrders} totalOrders={totalOrders} pending={pending} delivered={delivered} cancelled={cancelled} />
                </Route>

                {/* Sub-rota de Histórico (path="/history") mostra placeholder até API ficar pronta */}
                <Route path="/history">
                  <Card className="p-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-semibold">Histórico Completo</p>
                    <p className="text-muted-foreground mt-2">Em breve você verá todo seu histórico de pedidos aqui.</p>
                  </Card>
                </Route>

                {/* Sub-rota de Configurações (path="/settings") reserva layout para futuras preferências */}
                <Route path="/settings">
                  <Card className="p-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-semibold">Configurações</p>
                    <p className="text-muted-foreground mt-2">Página de configurações em desenvolvimento.</p>
                  </Card>
                </Route>

                </RouterSwitch>
              </NestedRouter>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}