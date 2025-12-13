import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";
import { DeliveryMap } from "@/components/DeliveryMap";
import { ClientStatusBadge } from "@/components/ClientStatusBadge";
import { DriverAvailabilityBadge } from "@/components/DriverScheduleViewer";
import { ChatWidget } from "@/components/ChatWidget";
import { OperationalInsights } from "@/components/OperationalInsights";
import type { Client, Motoboy } from "@shared/schema";
import type { ClientScheduleEntry, MotoboyScheduleEntry } from "@shared/contracts";
import type { NormalizedOrder, CompanyReport } from "./types";

const formatTime = (date: Date | null | undefined) =>
  date ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "-";

const currency = (value: number) => `R$ ${value.toFixed(2)}`;

type HomeProps = {
  clients: Client[];
  motoboys: Motoboy[];
  motoboyLocations: Array<{ motoboyId: string; latitude: number; longitude: number; timestamp: string }>;
  normalizedOrders: NormalizedOrder[];
  allClientSchedules: ClientScheduleEntry[];
  allMotoboySchedules: MotoboyScheduleEntry[];
  totalOrders: number;
  inProgress: number;
  delivered: number;
  activeDrivers: number;
  handleRefreshSchedules: () => void;
  companyReport?: CompanyReport;
  user: { id: string; name: string; role: string } | null;
};

export function CentralHomeRoute({
  clients,
  motoboys,
  motoboyLocations,
  normalizedOrders,
  allClientSchedules,
  allMotoboySchedules,
  totalOrders,
  inProgress,
  delivered,
  activeDrivers,
  handleRefreshSchedules,
  companyReport,
  user,
}: HomeProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const selectedOrder = useMemo(() => normalizedOrders.find((o) => o.id === selectedOrderId) || null, [normalizedOrders, selectedOrderId]);

  const deliveredWithProof = normalizedOrders.filter((o) => o.status === "delivered" && o.proofUrl);
  const today = new Date().getDay();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const isClientOpenNow = (clientSchedules: ClientScheduleEntry[]): boolean => {
    const todaySchedule = clientSchedules.find((s) => Number(s.diaSemana) === today);
    if (!todaySchedule || todaySchedule.fechado || !todaySchedule.horaAbertura || !todaySchedule.horaFechamento) {
      return false;
    }

    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const openTime = toMinutes(todaySchedule.horaAbertura);
    const closeTime = toMinutes(todaySchedule.horaFechamento);
    return currentMinutes >= openTime && currentMinutes <= closeTime;
  };

  const openClients = clients.filter((client) => {
    const clientSchedules = allClientSchedules.filter((s) => String(s.clientId) === String(client.id));
    return isClientOpenNow(clientSchedules);
  });

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6 relative">
        <div className="lg:col-span-2 relative z-0 order-2 lg:order-1">
          <DeliveryMap clients={clients} motoboys={motoboys} motoboyLocations={motoboyLocations} />
        </div>

        <div className="space-y-4 order-1 lg:order-2">
          <Card className="p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Status Rápido</h3>
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Pedidos Hoje</span>
                <span className="font-bold text-sm sm:text-base">{totalOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Em Rota</span>
                <span className="font-bold text-sm sm:text-base text-amber-600">{inProgress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Entregues</span>
                <span className="font-bold text-sm sm:text-base text-green-600">{delivered}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Motoboys Ativos</span>
                <span className="font-bold text-sm sm:text-base text-blue-600">{activeDrivers}</span>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="text-xs sm:text-sm font-semibold">📍 Clientes - Horários</h3>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleRefreshSchedules}>
                <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
              </Button>
            </div>
            <div className="space-y-2 max-h-[200px] sm:max-h-[240px] overflow-y-auto">
              {openClients.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum cliente aberto agora.</p>
              )}
              {openClients.map((client) => {
                const clientSchedules = allClientSchedules.filter((s) => String(s.clientId) === String(client.id));
                const scheduleForToday = clientSchedules.find(
                  (s) => Number(s.diaSemana) === today
                );
                const schedule = scheduleForToday || clientSchedules[0];

                return (
                  <div key={client.id} className="flex items-center justify-between py-1 border-b last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{client.name}</p>
                      {schedule ? (
                        <p className="text-[10px] text-muted-foreground">
                          {schedule.horaAbertura || "--"} - {schedule.horaFechamento || "--"}
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">SEM HORÁRIO</p>
                      )}
                    </div>
                    <ClientStatusBadge clientId={client.id} schedules={clientSchedules} />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">🏍️ Motoboys - Disponibilidade</h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {motoboys.slice(0, 6).map((motoboy) => {
                const motoboySchedules = allMotoboySchedules.filter((s) => s.motoboyId === motoboy.id);
                const scheduleToday = motoboySchedules.find((s) => Number(s.diaSemana) === today) || motoboySchedules[0];
                const shifts = scheduleToday
                  ? [
                      scheduleToday.turnoManha ? "Manhã" : null,
                      scheduleToday.turnoTarde ? "Tarde" : null,
                      scheduleToday.turnoNoite ? "Noite" : null,
                    ].filter(Boolean)
                  : [];
                return (
                  <div key={motoboy.id} className="flex items-center justify-between py-1 border-b last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{motoboy.name}</p>
                      {shifts.length > 0 ? (
                        <p className="text-[10px] text-muted-foreground">{shifts.join(" • ")}</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">Sem schedule</p>
                      )}
                    </div>
                    <DriverAvailabilityBadge motoboyId={motoboy.id} />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-4 mb-6">
        <h3 className="text-sm font-semibold mb-3">⚡ Últimos Pedidos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {normalizedOrders.slice(0, 6).map((order) => (
            <button
              key={order.id}
              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
              onClick={() => setSelectedOrderId(order.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">
                  {order.status === "pending" && "🆕"}
                  {order.status === "in_progress" && "🚚"}
                  {order.status === "delivered" && "✅"}
                  {" "}
                  {order.clientName}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {order.createdAtDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-1">→ {order.entregaBairro}</p>
              <p className="text-xs font-bold text-green-600">{currency(order.totalValue)}</p>
            </button>
          ))}
        </div>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="max-w-lg">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle>Pedido #{selectedOrder.id.slice(0, 8)}</DialogTitle>
                <DialogDescription>Detalhes rápidos do pedido mais recente.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Cliente</span>
                  <span>{selectedOrder.clientName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Status</span>
                  <Badge variant="outline">{selectedOrder.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Origem</p>
                  <p className="font-medium">{selectedOrder.coletaBairro} — {selectedOrder.coletaRua}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Destino</p>
                  <p className="font-medium">{selectedOrder.entregaBairro} — {selectedOrder.entregaRua}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded border p-2">
                    <p className="text-[11px] text-muted-foreground">Frete</p>
                    <p className="font-semibold">{currency(selectedOrder.freteValue)}</p>
                  </div>
                  <div className="rounded border p-2">
                    <p className="text-[11px] text-muted-foreground">Produtos</p>
                    <p className="font-semibold">{currency(selectedOrder.produtoValue)}</p>
                  </div>
                </div>
                <div className="rounded border p-2 bg-muted/50">
                  <p className="text-[11px] text-muted-foreground">Total</p>
                  <p className="font-bold text-lg">{currency(selectedOrder.totalValue)}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {companyReport && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">💰 KPIs Financeiros</h3>
            <Badge variant="outline" className="text-xs">
              Central - Visão Completa
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <p className="text-xs text-muted-foreground mb-1">Total de Pedidos</p>
              <p className="text-2xl font-bold">{companyReport.kpis.totalOrders}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <p className="text-xs text-muted-foreground mb-1">Receita Total</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{currency(companyReport.kpis.totalRevenue)}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
              <p className="text-xs text-muted-foreground mb-1">Comissões Guriri</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{currency(companyReport.kpis.totalComissoes)}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <p className="text-xs text-muted-foreground mb-1">Repasses Motoboys</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{currency(companyReport.kpis.totalRepasses)}</p>
            </Card>
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-3">💳 Breakdown por Método de Pagamento</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 border-l-4 border-l-green-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">💵 Dinheiro</span>
                  <Badge variant="secondary">{companyReport.breakdown.byPayment.Dinheiro.orders} pedidos</Badge>
                </div>
                <p className="text-xl font-bold text-green-600">{currency(companyReport.breakdown.byPayment.Dinheiro.revenue)}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">💳 Cartão</span>
                  <Badge variant="secondary">{companyReport.breakdown.byPayment.Cartão.orders} pedidos</Badge>
                </div>
                <p className="text-xl font-bold text-blue-600">{currency(companyReport.breakdown.byPayment.Cartão.revenue)}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-purple-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">📱 Pix</span>
                  <Badge variant="secondary">{companyReport.breakdown.byPayment.Pix.orders} pedidos</Badge>
                </div>
                <p className="text-xl font-bold text-purple-600">{currency(companyReport.breakdown.byPayment.Pix.revenue)}</p>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold mb-3">🏆 Top 10 Clientes</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {companyReport.topClients.map((client, index) => (
                  <Card key={client.clientId} className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={index < 3 ? "default" : "outline"} className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{client.clientName}</p>
                          <p className="text-xs text-muted-foreground">{client.totalOrders} pedidos</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-green-600">{currency(client.totalRevenue)}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">🏍️ Top 10 Motoboys</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {companyReport.topMotoboys.map((motoboy, index) => (
                  <Card key={motoboy.motoboyId} className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={index < 3 ? "default" : "outline"} className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{motoboy.motoboyName}</p>
                          <p className="text-xs text-muted-foreground">{motoboy.totalOrders} entregas</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-purple-600">{currency(motoboy.totalRepasse)}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {user && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">💬 Central de Comunicação</h3>
            <Badge variant="outline" className="text-xs">
              Tempo Real
            </Badge>
          </div>
          <div className="h-[600px] border rounded-lg overflow-hidden bg-muted/20">
            <ChatWidget
              currentUserId={user.id}
              currentUserName={user.name}
              currentUserRole={user.role as "client" | "motoboy" | "central"}
              embedded
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            💡 Gerencie conversas com clientes e motoboys em tempo real. Clique nas threads para ver o histórico completo de cada conversa.
          </p>
        </Card>
      )}

      <OperationalInsights
        clientSchedules={allClientSchedules}
        motoboySchedules={allMotoboySchedules}
        motoboysOnline={motoboys.filter((m) => m.online).length}
      />
    </>
  );
}
