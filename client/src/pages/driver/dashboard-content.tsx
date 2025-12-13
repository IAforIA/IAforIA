import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, TruckIcon, CheckCircle, DollarSign, AlertCircle, Check, X } from "lucide-react";
import { AvailableDeliveries } from "./available-deliveries";
import { MyDeliveries } from "./my-deliveries";
import type { DashboardContentProps } from "./types";

export function DashboardContent({
  availableOrders,
  assignedToMe,
  myOrders,
  deliveredToday,
  totalEarnings,
  motoboyReport,
  token,
  onAccept,
  onDecline,
  onDeliver,
  isAccepting,
  isDeclining,
  isDelivering,
}: DashboardContentProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Entregas Hoje" value={deliveredToday.length} icon={Package} />
        <StatCard title="Em Andamento" value={myOrders.length} icon={TruckIcon} />
        <StatCard title="Aguardando Aceite" value={assignedToMe.length} icon={AlertCircle} />
        <StatCard title="Ganhos Hoje" value={`R$ ${totalEarnings.toFixed(2)}`} icon={DollarSign} />
      </div>

      {/* Pedidos atribuídos pela central - requer aceite/recusa */}
      {assignedToMe.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 border-amber-400 dark:border-amber-600 border-2">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold">⚠️ Pedidos Atribuídos a Você</h3>
            <Badge variant="destructive" className="ml-auto">{assignedToMe.length} pendente(s)</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            A central atribuiu estes pedidos para você. Aceite para iniciar a entrega ou recuse para que outro motoboy seja escolhido.
          </p>
          <div className="space-y-3">
            {assignedToMe.map((order) => (
              <Card key={order.id} className="p-4 bg-card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{order.clientName}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{order.entregaBairro}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.entregaRua}, {order.entregaNumero}
                    </p>
                    <p className="text-xs mt-1">
                      <span className="font-semibold text-green-600">Sua taxa: R$ {order.taxaMotoboy || '0.00'}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => onDecline(order.id)}
                      disabled={isDeclining}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Recusar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => onAccept(order.id)}
                      disabled={isAccepting}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Aceitar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {motoboyReport && (
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">💰 Seus Ganhos</h3>
            <Badge variant="outline" className="text-xs">Apenas suas entregas</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="p-4 bg-card">
              <p className="text-xs text-muted-foreground mb-1">Total de Entregas</p>
              <p className="text-2xl font-bold">{motoboyReport.stats.totalEntregas}</p>
            </Card>
            <Card className="p-4 bg-card">
              <p className="text-xs text-muted-foreground mb-1">Ganhos Semanais</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">R$ {motoboyReport.stats.ganhosSemanais.toFixed(2)}</p>
            </Card>
            <Card className="p-4 bg-card">
              <p className="text-xs text-muted-foreground mb-1">Ganhos Mensais</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">R$ {motoboyReport.stats.ganhosMensais.toFixed(2)}</p>
            </Card>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">📊 Entregas por Método de Pagamento</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="p-3 bg-card border-l-4 border-l-green-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">💵 Dinheiro</span>
                  <Badge variant="secondary" className="text-lg font-bold">{motoboyReport.breakdown.byPayment.Dinheiro}</Badge>
                </div>
              </Card>
              <Card className="p-3 bg-card border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">💳 Cartão</span>
                  <Badge variant="secondary" className="text-lg font-bold">{motoboyReport.breakdown.byPayment.Cartão}</Badge>
                </div>
              </Card>
              <Card className="p-3 bg-card border-l-4 border-l-purple-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">📱 Pix</span>
                  <Badge variant="secondary" className="text-lg font-bold">{motoboyReport.breakdown.byPayment.Pix}</Badge>
                </div>
              </Card>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            ℹ️ Você visualiza apenas seus ganhos e entregas. Valores dos clientes não são exibidos.
          </p>
        </Card>
      )}

      <AvailableDeliveries orders={availableOrders} onAccept={onAccept} isAccepting={isAccepting} />
      <MyDeliveries orders={myOrders} token={token} onDeliver={onDeliver} isDelivering={isDelivering} />
    </>
  );
}
