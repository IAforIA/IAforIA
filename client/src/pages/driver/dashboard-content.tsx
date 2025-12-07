import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, TruckIcon, CheckCircle, DollarSign } from "lucide-react";
import { AvailableDeliveries } from "./available-deliveries";
import { MyDeliveries } from "./my-deliveries";
import type { DashboardContentProps } from "./types";

export function DashboardContent({
  availableOrders,
  myOrders,
  deliveredToday,
  totalEarnings,
  motoboyReport,
  token,
  onAccept,
  onDeliver,
  isAccepting,
  isDelivering,
}: DashboardContentProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Entregas Hoje" value={deliveredToday.length} icon={Package} />
        <StatCard title="Em Andamento" value={myOrders.length} icon={TruckIcon} />
        <StatCard title="Concluídas" value={deliveredToday.length} icon={CheckCircle} />
        <StatCard title="Ganhos Hoje" value={`R$ ${totalEarnings.toFixed(2)}`} icon={DollarSign} />
      </div>

      {motoboyReport && (
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">💰 Seus Ganhos</h3>
            <Badge variant="outline" className="text-xs">Apenas suas entregas</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="p-4 bg-white dark:bg-gray-900">
              <p className="text-xs text-muted-foreground mb-1">Total de Entregas</p>
              <p className="text-2xl font-bold">{motoboyReport.stats.totalEntregas}</p>
            </Card>
            <Card className="p-4 bg-white dark:bg-gray-900">
              <p className="text-xs text-muted-foreground mb-1">Ganhos Semanais</p>
              <p className="text-2xl font-bold text-green-600">R$ {motoboyReport.stats.ganhosSemanais.toFixed(2)}</p>
            </Card>
            <Card className="p-4 bg-white dark:bg-gray-900">
              <p className="text-xs text-muted-foreground mb-1">Ganhos Mensais</p>
              <p className="text-2xl font-bold text-purple-600">R$ {motoboyReport.stats.ganhosMensais.toFixed(2)}</p>
            </Card>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">📊 Entregas por Método de Pagamento</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="p-3 bg-white dark:bg-gray-900 border-l-4 border-l-green-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">💵 Dinheiro</span>
                  <Badge variant="secondary" className="text-lg font-bold">{motoboyReport.breakdown.byPayment.Dinheiro}</Badge>
                </div>
              </Card>
              <Card className="p-3 bg-white dark:bg-gray-900 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">💳 Cartão</span>
                  <Badge variant="secondary" className="text-lg font-bold">{motoboyReport.breakdown.byPayment.Cartão}</Badge>
                </div>
              </Card>
              <Card className="p-3 bg-white dark:bg-gray-900 border-l-4 border-l-purple-500">
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
