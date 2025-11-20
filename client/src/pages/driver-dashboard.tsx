/**
 * ARQUIVO: client/src/pages/driver-dashboard.tsx
 * PROPÓSITO: Área do motoboy para aceitar entregas, acompanhar progresso e ganhos
 * DESTAQUES: Divisão em rotas internas, WebSocket para atualizações e mutations de aceitar/entregar
 */

// Layout com sidebar responsiva compartilhada
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
// Roteamento interno do dashboard do motorista
import { Switch, Route, Router as NestedRouter } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
// Cartões reutilizáveis de estatística e pedido
import StatCard from "@/components/StatCard";
import OrderCard from "@/components/OrderCard";
import { TruckIcon, Package, CheckCircle, DollarSign, Camera, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
// Hooks utilitários
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Order, OrderStatus } from "@shared/schema";
import { resolveWebSocketUrl } from "@/lib/utils";

// Ajuda a converter valores armazenados como string (vindo do banco) sem quebrar a soma
const parseDecimalSafe = (value: string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

// Componente extraído para evitar recriação e perda de estado
const DeliverDialog = ({ order, token, onDeliver }: { order: Order, token: string | null, onDeliver: (data: { orderId: string, proofUrl?: string }) => void }) => {
  const [proofUrl, setProofUrl] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('orderId', order.id);
    formData.append('tipo', 'Comprovante');
    
    // Tenta capturar GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          formData.append('gpsLat', position.coords.latitude.toString());
          formData.append('gpsLng', position.coords.longitude.toString());
          uploadFile(formData);
        },
        (err) => {
          console.warn("GPS Error:", err);
          uploadFile(formData);
        }
      );
    } else {
      uploadFile(formData);
    }
  };

  const uploadFile = async (formData: FormData) => {
    try {
      const res = await fetch('/api/upload/live-doc', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      if (data.fileUrl) {
        setProofUrl(data.fileUrl);
        // toast não está disponível aqui fora, mas o usuário verá o ícone de sucesso
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeliver = () => {
    onDeliver({ orderId: order.id, proofUrl });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full mt-4"
          data-testid={`button-complete-${order.id}`}
        >
          Marcar como Entregue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalizar Entrega</DialogTitle>
          <DialogDescription>
            Tire uma foto do comprovante da maquininha.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={`proof-upload-${order.id}`} className="cursor-pointer block">
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors">
                {proofUrl ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Foto anexada!</span>
                    <span className="text-xs text-muted-foreground break-all">{proofUrl.split('/').pop()}</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm font-medium">Tirar Foto do Comprovante</span>
                    <span className="text-xs text-muted-foreground">Clique para abrir a câmera</span>
                  </>
                )}
              </div>
              <Input
                id={`proof-upload-${order.id}`}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </Label>
            {isUploading && <p className="text-xs text-center text-muted-foreground animate-pulse">Enviando foto...</p>}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor={`proof-text-${order.id}`}>Observação (Opcional)</Label>
            <Input
              id={`proof-text-${order.id}`}
              placeholder="Ex: Entregue na portaria"
              value={proofUrl.startsWith('/uploads') ? '' : proofUrl}
              onChange={(e) => {
                if (!proofUrl.startsWith('/uploads')) {
                  setProofUrl(e.target.value);
                }
              }}
              disabled={proofUrl.startsWith('/uploads')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeliver} disabled={isUploading}>
            Confirmar Entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function DriverDashboard() {
  console.log("🚀 DriverDashboard mounting...");
  // UI feedback e contexto global autenticado
  const { toast } = useToast();
  const { user, logout, token } = useAuth();

  // Consulta centralizada reutilizada por todos os blocos
  const { data: orders = [], refetch } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  // Derivações locais reduzem custo no servidor e deixam o componente declarativo
  const availableOrders = orders.filter(o => o.status === 'pending');
  const myOrders = orders.filter(o => o.motoboyId === user?.id && o.status === 'in_progress');
  const deliveredToday = orders.filter(o =>
    o.motoboyId === user?.id &&
    o.status === 'delivered' &&
    o.deliveredAt && new Date(o.deliveredAt).toDateString() === new Date().toDateString()
  );

  const myHistory = orders.filter(o => 
    o.motoboyId === user?.id && 
    o.status === 'delivered'
  );

  // Soma taxas das entregas concluídas no dia (valida strings numéricas)
  const totalEarnings = deliveredToday.reduce((sum, o) => sum + parseDecimalSafe(o.taxaMotoboy), 0);

  // WebSocket autenticado garante atualização imediata sem polling
  useEffect(() => {
    if (!user?.id || !token) return;

    const websocket = new WebSocket(resolveWebSocketUrl(token));

    websocket.onmessage = () => refetch();

    return () => websocket.close();
  }, [user?.id, refetch, token]);

  // Mutation: motoboy aceita entrega pendente
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

  // Mutation: marca entrega como concluída
  const deliverOrderMutation = useMutation({
    mutationFn: async ({ orderId, proofUrl }: { orderId: string, proofUrl?: string }) => {
      const res = await apiRequest('POST', `/api/orders/${orderId}/deliver`, { proofUrl });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Entrega concluída!",
        description: "O pedido foi marcado como entregue.",
      });
    },
    onError: (error) => {
      console.error("Erro na entrega:", error);
      toast({
        variant: "destructive",
        title: "Erro ao finalizar entrega",
        description: "Não foi possível marcar como entregue. Tente novamente.",
      });
    },
  });

  // Custom properties mantêm largura consistente do sidebar
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  // Criamos componentes para o conteúdo das rotas para organizar o <Switch>
  const DashboardContent = () => (
    <>
      {/* KPIs principais: entregas, andamento e ganhos do dia */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Entregas Hoje" value={deliveredToday.length} icon={Package} />
        <StatCard title="Em Andamento" value={myOrders.length} icon={TruckIcon} />
        <StatCard title="Concluídas" value={deliveredToday.length} icon={CheckCircle} />
        <StatCard title="Ganhos Hoje" value={`R$ ${totalEarnings.toFixed(2)}`} icon={DollarSign} />
      </div>
      {/* Seções abaixo reaproveitam arrays filtrados acima */}
      <AvailableDeliveries />
      <MyDeliveries />
    </>
  );

  // Lista pedidos pendentes que qualquer motoboy pode aceitar
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
                // STEP 3: Pass payment & address info
                formaPagamento={order.formaPagamento}
                hasTroco={order.hasTroco}
                trocoValor={order.trocoValor}
                complemento={order.coletaComplemento || undefined}
                referencia={order.referencia || undefined}
                observacoes={order.observacoes || undefined}
              />
              {/* Botão chama mutation de aceite e respeita loading state */}
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

  // Mostra apenas pedidos do motoboy atual em andamento
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
                // STEP 3: Pass payment & address info
                formaPagamento={order.formaPagamento}
                hasTroco={order.hasTroco}
                trocoValor={order.trocoValor}
                complemento={order.coletaComplemento || undefined}
                referencia={order.referencia || undefined}
                observacoes={order.observacoes || undefined}
              />
              <DeliverDialog 
                order={order} 
                token={token} 
                onDeliver={(data) => deliverOrderMutation.mutate(data)} 
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const History = () => (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Histórico de Entregas</h2>
      {myHistory.length === 0 ? (
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
              <TableHead>Comprovante</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myHistory.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{order.coletaBairro}</TableCell>
                <TableCell>{order.entregaBairro}</TableCell>
                <TableCell>R$ {parseFloat(order.taxaMotoboy || "0").toFixed(2)}</TableCell>
                <TableCell>
                  {order.proofUrl ? (
                    <a 
                      href={order.proofUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ver Foto
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );

  const LiveDocs = () => (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Live Docs - Comprovantes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myHistory.filter(o => o.proofUrl).map(order => (
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
        {myHistory.filter(o => o.proofUrl).length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>Nenhum comprovante enviado ainda.</p>
          </div>
        )}
      </div>
    </Card>
  );


  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        {/* Sidebar assume role="driver" para montar menu adequado */}
        <AppSidebar role="driver" />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-semibold" data-testid="text-page-title">Dashboard do Entregador</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Badge indica disponibilidade atual (futuro: leitura do status real) */}
              <Badge className="bg-green-500 text-white" data-testid="badge-status">Disponível</Badge>
              <ThemeToggle />
              <Button variant="outline" onClick={logout} data-testid="button-logout">Sair</Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Router interno limita rotas ao /driver */}
              <NestedRouter base="/driver">
                <Switch>
                {/* Rota Principal (path="/") resume estatísticas e seções principais */}
                <Route path="/" component={DashboardContent} />

                {/* Sub-rota de Entregas Disponíveis (path="/available") */}
                <Route path="/available" component={AvailableDeliveries} />

                {/* Sub-rota de Minhas Entregas (path="/my-deliveries") */}
                <Route path="/my-deliveries" component={MyDeliveries} />

                {/* Sub-rota de Histórico (path="/history") */}
                <Route path="/history" component={History} />

                {/* Sub-rota de Live Docs (path="/live-docs") */}
                <Route path="/live-docs" component={LiveDocs} />

                {/* Sub-rota de Configurações (path="/settings") reserva layout futuro */}
                <Route path="/settings">
                  <>
                    <h2 className="text-2xl font-bold mb-6">Configurações da Conta</h2>

                    <Card className="p-6 max-w-2xl">
                      <h3 className="text-lg font-semibold mb-4">Informações Pessoais</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Nome</label>
                          <Input placeholder="Seu nome completo" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Email</label>
                          <Input type="email" placeholder="seu@email.com" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Telefone</label>
                          <Input placeholder="(00) 00000-0000" />
                        </div>
                      </div>

                      <div className="border-t mt-6 pt-6">
                        <h3 className="text-lg font-semibold mb-4">Segurança</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Senha Atual</label>
                            <Input type="password" placeholder="••••••••" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Nova Senha</label>
                            <Input type="password" placeholder="••••••••" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Confirmar Nova Senha</label>
                            <Input type="password" placeholder="••••••••" />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-6">
                        <Button>Salvar Alterações</Button>
                        <Button variant="outline">Cancelar</Button>
                      </div>
                    </Card>
                  </>
                </Route>

                </Switch>
              </NestedRouter>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}