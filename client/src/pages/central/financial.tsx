import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Client, Motoboy } from "@shared/schema";
import type { NormalizedOrder } from "./types";

type FinancialProps = {
  finStartDate: string;
  finEndDate: string;
  finMotoboyFilter: string;
  finClientFilter: string;
  setFinStartDate: (value: string) => void;
  setFinEndDate: (value: string) => void;
  handleFinMotoboyFilterChange: (value: string) => void;
  handleFinClientFilterChange: (value: string) => void;
  filteredDeliveredOrders: NormalizedOrder[];
  financialSummary: any;
  motoboySnapshots: any[];
  clientSnapshots: any[];
  deliveredTodayOrders: NormalizedOrder[];
  deliveredTodaySummary: any;
  pendingOrders: NormalizedOrder[];
  pendingSummary: any;
  clients: Client[];
  motoboys: Motoboy[];
};

export function FinancialRoute({
  finStartDate,
  finEndDate,
  finMotoboyFilter,
  finClientFilter,
  setFinStartDate,
  setFinEndDate,
  handleFinMotoboyFilterChange,
  handleFinClientFilterChange,
  filteredDeliveredOrders,
  financialSummary,
  motoboySnapshots,
  clientSnapshots,
  deliveredTodayOrders,
  deliveredTodaySummary,
  pendingOrders,
  pendingSummary,
  clients,
  motoboys,
}: FinancialProps) {
  // Safeguards to avoid undefined during initial render
  const safeFinancialSummary = financialSummary || {
    totalFrete: 0,
    totalMotoboy: 0,
    lucroGuriri: 0,
    volumeTotal: 0,
  };
  const safeMotoboySnapshots = motoboySnapshots || [];
  const safeClientSnapshots = clientSnapshots || [];
  const safeFilteredDeliveredOrders = filteredDeliveredOrders || [];
  const safeDeliveredTodayOrders = deliveredTodayOrders || [];
  const safePendingOrders = pendingOrders || [];
  const safeClients = clients || [];
  const safeMotoboys = motoboys || [];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">💰 Gestão Financeira - Repasse Diário</h2>
      </div>

      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">📅 Selecionar Período e Filtros</h3>
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Data Inicial</label>
            <Input
              type="date"
              className="dark:text-foreground dark:bg-background dark:[color-scheme:dark]"
              value={finStartDate}
              onChange={(e) => setFinStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Data Final</label>
            <Input
              type="date"
              className="dark:text-foreground dark:bg-background dark:[color-scheme:dark]"
              value={finEndDate}
              onChange={(e) => setFinEndDate(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Motoboy</label>
            <Select value={finMotoboyFilter} onValueChange={handleFinMotoboyFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os motoboys</SelectItem>
                {safeMotoboys.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Cliente</label>
            <Select value={finClientFilter} onValueChange={handleFinClientFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {safeClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];
              setFinStartDate(today);
              setFinEndDate(today);
            }}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split("T")[0];
              setFinStartDate(yesterdayStr);
              setFinEndDate(yesterdayStr);
            }}
          >
            Ontem
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-green-50 dark:bg-green-950">
          <p className="text-sm text-muted-foreground">Receita de Fretes</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">R$ {safeFinancialSummary.totalFrete.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{safeFilteredDeliveredOrders.length} entregas</p>
        </Card>
        <Card className="p-4 bg-amber-50 dark:bg-amber-950">
          <p className="text-sm text-muted-foreground">Pagar Motoboys</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">R$ {safeFinancialSummary.totalMotoboy.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Repasse total</p>
        </Card>
        <Card className="p-4 bg-blue-50 dark:bg-blue-950">
          <p className="text-sm text-muted-foreground">Lucro Guriri</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">R$ {safeFinancialSummary.lucroGuriri.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Frete - Motoboy</p>
        </Card>
        <Card className="p-4 bg-purple-50 dark:bg-purple-950">
          <p className="text-sm text-muted-foreground">Volume de Produtos</p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">R$ {safeFinancialSummary.volumeTotal.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Valor total dos pedidos</p>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-green-700 dark:text-green-300">💵 REPASSE PARA MOTOBOYS</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left">
                <th className="p-3">Motoboy</th>
                <th className="p-3 text-right">Entregas</th>
                <th className="p-3 text-right">Total a Pagar</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {safeMotoboySnapshots.map((snapshot) => (
                <tr key={snapshot.motoboyId} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-semibold">{snapshot.motoboyName}</td>
                  <td className="p-3 text-right">{snapshot.orders.length}</td>
                  <td className="p-3 text-right">
                    <span className="font-bold text-green-600 text-lg">R$ {snapshot.totalRepasse.toFixed(2)}</span>
                  </td>
                  <td className="p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const details = snapshot.orders
                          .map((o: any, i: number) => `${i + 1}. ${o.deliveredAtDate?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) ?? "--"} - ${o.clientName} → ${o.entregaBairro} - R$ ${o.motoboyValue.toFixed(2)}`)
                          .join("\n");
                        alert(`Detalhes - ${snapshot.motoboyName}\n\nTotal: R$ ${snapshot.totalRepasse.toFixed(2)}\n\n${details}`);
                      }}
                    >
                      Ver Detalhes
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-blue-700 dark:text-blue-300">🧾 REPASSE DE FRETES DOS CLIENTES</h3>
        <p className="text-sm text-muted-foreground mb-4">💡 Cobrança: <strong>Mensalidade</strong> (1x/mês) + <strong>Repasse de Fretes</strong> (semanal ou diário)</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left">
                <th className="p-3">Cliente</th>
                <th className="p-3 text-right">Pedidos</th>
                <th className="p-3 text-right">Repasse de Frete</th>
                <th className="p-3 text-right">Volume Produtos</th>
                <th className="p-3 text-right">Total Movimentado</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {safeClientSnapshots.map((snapshot) => (
                <tr key={snapshot.clientId} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-semibold">{snapshot.clientName}</td>
                  <td className="p-3 text-right">{snapshot.orders.length}</td>
                  <td className="p-3 text-right">
                    <span className="font-bold text-blue-600 text-lg">R$ {snapshot.totalFrete.toFixed(2)}</span>
                  </td>
                  <td className="p-3 text-right">R$ {snapshot.totalProduto.toFixed(2)}</td>
                  <td className="p-3 text-right">R$ {snapshot.totalMovimentado.toFixed(2)}</td>
                  <td className="p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const details = snapshot.orders
                          .map(
                            (o: any, i: number) =>
                              `${i + 1}. ${o.deliveredAtDate?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) ?? "--"} - ${o.entregaBairro}, ${o.entregaRua} - Frete: R$ ${o.freteValue.toFixed(2)} + Produto: R$ ${o.produtoValue.toFixed(2)}`
                          )
                          .join("\n");
                        alert(
                          `Detalhes - ${snapshot.clientName}\n\nREPASSE DE FRETE: R$ ${snapshot.totalFrete.toFixed(2)}\nVolume de Produtos: R$ ${snapshot.totalProduto.toFixed(2)}\nTotal Movimentado: R$ ${snapshot.totalMovimentado.toFixed(2)}\n\n${details}`
                        );
                      }}
                    >
                      Ver Detalhes
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Todos os Pedidos Entregues no Período</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr className="text-left">
                <th className="p-2">Horário</th>
                <th className="p-2">Cliente</th>
                <th className="p-2">Motoboy</th>
                <th className="p-2">Endereço Entrega</th>
                <th className="p-2 text-right">Frete</th>
                <th className="p-2 text-right">Produto</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-right">Motoboy Recebe</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveredOrders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-muted/30">
                  <td className="p-2 whitespace-nowrap">
                    {order.deliveredAtDate?.toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) ?? "-"}
                  </td>
                  <td className="p-2">{order.clientName}</td>
                  <td className="p-2">{order.motoboyName}</td>
                  <td className="p-2">{order.entregaBairro}, {order.entregaRua}</td>
                  <td className="p-2 text-right">R$ {order.freteValue.toFixed(2)}</td>
                  <td className="p-2 text-right">R$ {order.produtoValue.toFixed(2)}</td>
                  <td className="p-2 text-right font-semibold">R$ {order.totalValue.toFixed(2)}</td>
                  <td className="p-2 text-right text-green-600 font-semibold">R$ {order.motoboyValue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
