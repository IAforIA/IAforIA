import StatCard from "@/components/StatCard";
import OrderCard from "@/components/OrderCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Clock, CheckCircle, XCircle, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import type { Order, OrderStatus } from "@shared/schema";
import type { DashboardContentProps } from "./types";

export function DashboardContent({
  clientOrders,
  totalOrders,
  pending,
  inProgress,
  delivered,
  cancelled,
  clientReport,
}: DashboardContentProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    return clientOrders.filter((order) => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesPayment = paymentFilter === "all" || order.formaPagamento === paymentFilter;
      const matchesSearch =
        !normalizedSearch ||
        `${order.coletaBairro} ${order.entregaBairro} ${order.coletaRua} ${order.entregaRua}`
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesStatus && matchesPayment && matchesSearch;
    });
  }, [clientOrders, paymentFilter, search, statusFilter]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
        <StatCard title="Total" value={totalOrders} icon={Package} />
        <StatCard title="Aguardando" value={pending} icon={Clock} />
        <StatCard title="Em Rota" value={inProgress} icon={Truck} />
        <StatCard title="Concluídos" value={delivered} icon={CheckCircle} />
        <StatCard title="Cancelados" value={cancelled} icon={XCircle} />
      </div>

      {clientReport && (
        <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">💰 Resumo Financeiro</h3>
            <Badge variant="outline" className="text-xs">Apenas seus dados</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="p-4 bg-card">
              <p className="text-xs text-muted-foreground mb-1">Total de Entregas</p>
              <p className="text-2xl font-bold">{clientReport.stats.totalOrders}</p>
            </Card>
            <Card className="p-4 bg-card">
              <p className="text-xs text-muted-foreground mb-1">Faturamento Total</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">R$ {clientReport.stats.totalFaturamento.toFixed(2)}</p>
            </Card>
            <Card className="p-4 bg-card">
              <p className="text-xs text-muted-foreground mb-1">Repasse para Guriri</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">R$ {clientReport.stats.totalRepasse.toFixed(2)}</p>
            </Card>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">📊 Vendas por Método de Pagamento</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="p-3 bg-card border-l-4 border-l-green-500">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">💵 Dinheiro</span>
                  <Badge variant="secondary" className="text-xs">{clientReport.breakdown.byPayment.Dinheiro.orders}</Badge>
                </div>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">R$ {clientReport.breakdown.byPayment.Dinheiro.revenue.toFixed(2)}</p>
              </Card>
              <Card className="p-3 bg-card border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">💳 Cartão</span>
                  <Badge variant="secondary" className="text-xs">{clientReport.breakdown.byPayment.Cartão.orders}</Badge>
                </div>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">R$ {clientReport.breakdown.byPayment.Cartão.revenue.toFixed(2)}</p>
              </Card>
              <Card className="p-3 bg-card border-l-4 border-l-purple-500">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">📱 Pix</span>
                  <Badge variant="secondary" className="text-xs">{clientReport.breakdown.byPayment.Pix.orders}</Badge>
                </div>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">R$ {clientReport.breakdown.byPayment.Pix.revenue.toFixed(2)}</p>
              </Card>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            ℹ️ Você visualiza apenas seus pedidos e faturamento. Comissões internas não são exibidas.
          </p>
        </Card>
      )}

      <Card className="p-4 mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">Filtrar pedidos</p>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Input
              placeholder="Buscar por bairro ou rua"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Aguardando</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="delivered">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Cartão">Cartão</SelectItem>
                <SelectItem value="Pix">Pix</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {filteredOrders.slice(0, 9).map((order: Order) => (
          <OrderCard
            key={order.id}
            id={order.id}
            origin={`${order.coletaRua}, ${order.coletaNumero} - ${order.coletaBairro}`}
            destination={`${order.entregaRua}, ${order.entregaNumero} - ${order.entregaBairro}`}
            status={order.status as OrderStatus}
            value={order.valor}
            driverName={order.motoboyName || undefined}
            onView={() => console.log('View order:', order.id)}
            formaPagamento={order.formaPagamento}
            hasTroco={order.hasTroco || false}
            trocoValor={order.trocoValor || undefined}
            complemento={order.coletaComplemento || undefined}
            referencia={order.referencia || undefined}
            observacoes={order.observacoes || undefined}
            produtoNome={order.produtoNome || undefined}
            produtoQuantidade={order.produtoQuantidade || undefined}
            produtoPrecoUnitario={order.produtoPrecoUnitario || undefined}
            produtoValorTotal={order.produtoValorTotal || undefined}
          />
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum pedido criado ainda</p>
        </Card>
      )}
    </>
  );
}
