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
import { useAuth } from "@/hooks/use-auth";
import { ChatWidget } from "@/components/ChatWidget";
import type { Order, OrderStatus } from "@shared/schema";
import type { ClientProfileDto } from "@shared/contracts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import { resolveWebSocketUrl } from "@/lib/utils";
import { Switch as UiSwitch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ClientScheduleViewer } from "@/components/ClientScheduleViewer";
import { ClientScheduleEditor } from "@/components/ClientScheduleEditor";
import { SettingsPage } from "@/components/SettingsPage";

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
  coletaBairro: z.string().min(3, "Bairro é obrigatória"),
  coletaCep: z.string().default("29900-000"),
  coletaOverride: z.boolean().default(false), // Etapa 06: toggle auto-fill
  // STEP 2: Address Details
  coletaComplemento: z.string().optional(),
  referencia: z.string().optional(),
  entregaRua: z.string().min(3, "Rua é obrigatória"),
  entregaNumero: z.string().min(1, "Número é obrigatório"),
  entregaBairro: z.string().min(3, "Bairro é obrigatório"),
  entregaCep: z.string().default("29900-000"),
  entregaComplemento: z.string().optional(),
  observacoes: z.string().optional(),
  valor: z.number().min(0.01, "Selecione o valor da entrega"),
  // STEP 1: Payment & Change fields
  formaPagamento: z.enum(["dinheiro", "cartao", "pix"], {
    required_error: "Forma de pagamento é obrigatória",
  }),
  hasTroco: z.boolean().default(false),
  trocoValor: z.number().optional(),
}).refine(
  (data) => {
    // If payment is cash and change is needed, trocoValor must be provided
    if (data.formaPagamento === "dinheiro" && data.hasTroco && !data.trocoValor) {
      return false;
    }
    return true;
  },
  {
    message: "Informe o valor para o troco",
    path: ["trocoValor"],
  }
);

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

  // QUERY: Busca horário de funcionamento do cliente
  interface ClientScheduleEntry {
    id: string;
    clientId: string;
    diaSemana: number;
    horaAbertura: string | null;
    horaFechamento: string | null;
    fechado: boolean;
  }

  const { data: clientSchedule = [] } = useQuery<ClientScheduleEntry[]>({
    queryKey: ['/api/clients', user?.id, 'schedules'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/clients/${user?.id}/schedules`, {});
      return res.json();
    },
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

  // VALIDATION: Verifica se o cliente está em horário de funcionamento
  const validateBusinessHours = (): { valid: boolean; message: string } => {
    if (!clientSchedule || clientSchedule.length === 0) {
      // Sem horário cadastrado, permite criar pedido
      return { valid: true, message: '' };
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Domingo, 6 = Sábado
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Busca horários do dia atual
    const todaySchedules = clientSchedule.filter(s => s.diaSemana === currentDay);

    if (todaySchedules.length === 0 || todaySchedules[0].fechado) {
      return {
        valid: false,
        message: 'Seu estabelecimento está FECHADO hoje. Não é possível criar pedidos em dias de folga.',
      };
    }

    const schedule = todaySchedules[0];
    if (!schedule.horaAbertura || !schedule.horaFechamento) {
      return {
        valid: false,
        message: 'Horário de funcionamento não cadastrado para hoje.',
      };
    }

    // Verifica se está dentro do horário de funcionamento
    const isWithinBusinessHours = currentTime >= schedule.horaAbertura && currentTime <= schedule.horaFechamento;

    if (!isWithinBusinessHours) {
      return {
        valid: false,
        message: `Seu estabelecimento está FECHADO neste momento. Horário de funcionamento hoje: ${schedule.horaAbertura} às ${schedule.horaFechamento}`,
      };
    }

    return { valid: true, message: '' };
  };

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
        // STEP 2: Send address details
        coletaComplemento: data.coletaComplemento || '',
        referencia: data.referencia || '',
        entregaComplemento: data.entregaComplemento || '',
        observacoes: data.observacoes || '',
        valor: data.valor.toFixed(2),
        // STEP 1: Send payment data instead of hardcoding
        formaPagamento: data.formaPagamento,
        hasTroco: data.hasTroco,
        trocoValor: data.trocoValor ? data.trocoValor.toFixed(2) : null,
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
        // STEP 2: Reset address details
        coletaComplemento: '',
        referencia: '',
        entregaRua: '',
        entregaNumero: '',
        entregaBairro: '',
        entregaCep: '29900-000',
        entregaComplemento: '',
        observacoes: '',
        valor: 7.00,
        taxaMotoboy: 7.00,
        // STEP 1: Reset payment fields
        formaPagamento: 'dinheiro',
        hasTroco: false,
        trocoValor: undefined,
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
      // STEP 2: Default address details
      coletaComplemento: "",
      referencia: "",
      entregaRua: "",
      entregaNumero: "",
      entregaBairro: "",
      entregaCep: "29900-000",
      entregaComplemento: "",
      observacoes: "",
      valor: 7.00,
      taxaMotoboy: 7.00,
      // STEP 1: Default payment values
      formaPagamento: "dinheiro",
      hasTroco: false,
      trocoValor: undefined,
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
  const deliveredOrders = clientOrders.filter(o => o.status === 'delivered');
  const deliveredCount = deliveredOrders.length;
  const cancelled = clientOrders.filter(o => o.status === 'cancelled').length;

  // Custom properties para largura do sidebar
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  const LiveDocs = () => (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Live Docs - Comprovantes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deliveredOrders.filter(o => o.proofUrl).map(order => (
          <Card key={order.id} className="p-4">
            <div className="aspect-video relative mb-4 bg-muted rounded-md overflow-hidden">
              <img 
                src={order.proofUrl || ''} 
                alt={`Comprovante Pedido #${order.id}`}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Pedido #{order.id.slice(0, 8)}</span>
                <Badge variant="outline">{order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString() : '-'}</Badge>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <a href={order.proofUrl || '#'} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Original
                </a>
              </Button>
            </div>
          </Card>
        ))}
        {deliveredOrders.filter(o => o.proofUrl).length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>Nenhum comprovante disponível ainda.</p>
          </div>
        )}
      </div>
    </Card>
  );

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
                    <form onSubmit={form.handleSubmit((data) => {
                      // Validate business hours before submission
                      const validation = validateBusinessHours();
                      if (!validation.valid) {
                        toast({
                          title: "Fora do horário de funcionamento",
                          description: validation.message,
                          variant: "destructive",
                        });
                        return;
                      }
                      createOrderMutation.mutate(data);
                    })} className="space-y-4">
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
                        {/* STEP 2: Complemento and Referencia fields */}
                        <FormField control={form.control} name="coletaComplemento" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complemento (Opcional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Ex: Apto 302, Sala 10"
                                data-testid="input-coleta-complemento"
                                readOnly={isColetaLocked}
                                aria-readonly={isColetaLocked}
                                className={isColetaLocked ? "bg-muted" : undefined}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="referencia" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Referência (Opcional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Ex: Próximo ao banco, Em frente à padaria"
                                data-testid="input-referencia"
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
                        {/* STEP 2: Delivery Complemento field */}
                        <FormField control={form.control} name="entregaComplemento" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complemento (Opcional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: Apto 101, Casa 2" data-testid="input-entrega-complemento" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {/* Bloco 3: Descrição do Item/Produto */}
                      <FormField control={form.control} name="observacoes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>O que você está enviando? (Descrição do Produto)</FormLabel>
                          <FormControl>
                            <textarea
                              {...field}
                              placeholder="Ex: 1 pizza grande, Documentos, Encomenda, Roupas, etc."
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              data-testid="textarea-observacoes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Bloco 4: Financeiro - Valor e Pagamento */}
                      <div className="space-y-4 rounded-lg border-2 border-primary/20 p-4 bg-primary/5">
                        <h3 className="font-semibold text-lg">💰 Valor e Pagamento</h3>
                        
                        {/* Valor da Entrega */}
                        <FormField control={form.control} name="valor" render={({ field }) => {
                          const hasMensalidade = profile && Number(profile.mensalidade) > 0;
                          const valorOptions = hasMensalidade 
                            ? [
                                { value: "7", label: "Padrão - R$ 7,00" },
                                { value: "10", label: "Média Distância - R$ 10,00" },
                                { value: "15", label: "Longa Distância - R$ 15,00" }
                              ]
                            : [
                                { value: "8", label: "Padrão - R$ 8,00" },
                                { value: "10", label: "Média Distância - R$ 10,00" },
                                { value: "15", label: "Longa Distância - R$ 15,00" }
                              ];
                          
                          return (
                            <FormItem>
                              <FormLabel>Valor da Entrega (Frete)</FormLabel>
                              <Select 
                                onValueChange={(val) => field.onChange(parseFloat(val))} 
                                value={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-valor-entrega">
                                    <SelectValue placeholder="Selecione o valor do frete" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {valorOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-sm text-muted-foreground mt-1">
                                💡 Taxa do motoboy calculada automaticamente
                              </p>
                              <FormMessage />
                            </FormItem>
                          );
                        }} />

                        {/* Forma de Pagamento */}
                        <FormField control={form.control} name="formaPagamento" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Forma de Pagamento</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-forma-pagamento">
                                  <SelectValue placeholder="Como vai pagar?" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                                <SelectItem value="cartao">💳 Cartão</SelectItem>
                                <SelectItem value="pix">📱 Pix</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Troco (somente se dinheiro) */}
                        {form.watch('formaPagamento') === 'dinheiro' && (
                          <div className="space-y-3 p-3 bg-background rounded-md border">
                            <FormField control={form.control} name="hasTroco" render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="checkbox-has-troco"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Precisa de troco?</FormLabel>
                                </div>
                              </FormItem>
                            )} />

                            {form.watch('hasTroco') && (
                              <FormField control={form.control} name="trocoValor" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Troco para quanto? (R$)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="number" 
                                      step="0.01" 
                                      placeholder="50.00"
                                      onChange={e => field.onChange(parseFloat(e.target.value))}
                                      value={field.value || ''}
                                      data-testid="input-troco-valor"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            )}
                          </div>
                        )}
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
                  <DashboardContent clientOrders={clientOrders} totalOrders={totalOrders} pending={pending} delivered={deliveredCount} cancelled={cancelled} />
                </Route>

                {/* Rota de Pedidos (path="/orders") mantém mesma listagem para breadcrumbs futuros */}
                <Route path="/orders">
                  <DashboardContent clientOrders={clientOrders} totalOrders={totalOrders} pending={pending} delivered={deliveredCount} cancelled={cancelled} />
                </Route>

                {/* Sub-rota de Histórico (path="/history") */}
                <Route path="/history">
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Histórico de Entregas</h2>
                    {deliveredOrders.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhuma entrega finalizada ainda.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Origem</TableHead>
                            <TableHead>Destino</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Motoboy</TableHead>
                            <TableHead>Comprovante</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deliveredOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell className="max-w-[200px] truncate" title={`${order.coletaRua}, ${order.coletaNumero}`}>{order.coletaRua}, {order.coletaNumero}</TableCell>
                              <TableCell className="max-w-[200px] truncate" title={`${order.entregaRua}, ${order.entregaNumero}`}>{order.entregaRua}, {order.entregaNumero}</TableCell>
                              <TableCell>R$ {Number(order.valor).toFixed(2)}</TableCell>
                              <TableCell>{order.motoboyName || '-'}</TableCell>
                              <TableCell>
                                {order.proofUrl ? (
                                  <a href={order.proofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                                    Ver <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Pendente</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Card>
                </Route>

                {/* Sub-rota de Live Docs (path="/live-docs") */}
                <Route path="/live-docs" component={LiveDocs} />

                {/* Sub-rota de Horário de Funcionamento (path="/schedule") */}
                <Route path="/schedule">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Horário de Funcionamento</h2>
                      <p className="text-muted-foreground">Configure quando seu estabelecimento está aberto para receber pedidos</p>
                    </div>
                    {user && (
                      <ClientScheduleEditor clientId={user.id} />
                    )}
                  </div>
                </Route>

                {/* Sub-rota de Configurações (path="/settings") reserva layout para futuras preferências */}
                <Route path="/settings">
                  <SettingsPage user={user} />
                </Route>

                </RouterSwitch>
              </NestedRouter>
            </div>
          </main>
        </div>
      </div>

      {/* Chat Widget - Comunicação com Central */}
      {user && (
        <ChatWidget
          currentUserId={user.id}
          currentUserName={user.name}
          currentUserRole={user.role}
        />
      )}
    </SidebarProvider>
  );
}