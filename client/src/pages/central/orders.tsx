import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Motoboy } from "@shared/schema";
import type { NormalizedOrder } from "./types";

export type OrdersFilters = {
  orderDateFilter: string;
  orderStartDateFilter: string;
  orderEndDateFilter: string;
  orderClientFilter: string;
  orderMotoboyFilter: string;
  orderStatusFilter: string;
  orderPaymentFilter: string;
  orderSearchFilter: string;
  handleOrderStatusFilterChange: (value: string) => void;
  handleOrderClientFilterChange: (value: string) => void;
  handleOrderMotoboyFilterChange: (value: string) => void;
  handleOrderPaymentFilterChange: (value: string) => void;
  setOrderDateFilter: (value: string) => void;
  setOrderStartDateFilter: (value: string) => void;
  setOrderEndDateFilter: (value: string) => void;
  setOrderSearchFilter: (value: string) => void;
};

type OrdersRouteProps = {
  orders: NormalizedOrder[];
  clients: Client[];
  motoboys: Motoboy[];
  orderDateFilter: string;
  orderStartDateFilter: string;
  orderEndDateFilter: string;
  orderClientFilter: string;
  orderMotoboyFilter: string;
  orderStatusFilter: string;
  orderPaymentFilter: string;
  orderSearchFilter: string;
  onStatusChange: (value: string) => void;
  onClientChange: (value: string) => void;
  onMotoboyChange: (value: string) => void;
  onPaymentChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
};

export function OrdersRoute({
  orders,
  clients,
  motoboys,
  orderDateFilter,
  orderStartDateFilter,
  orderEndDateFilter,
  orderClientFilter,
  orderMotoboyFilter,
  orderStatusFilter,
  orderPaymentFilter,
  orderSearchFilter,
  onStatusChange,
  onClientChange,
  onMotoboyChange,
  onPaymentChange,
  onDateChange,
  onStartDateChange,
  onEndDateChange,
  onSearchChange,
}: OrdersRouteProps) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeMotoboys = Array.isArray(motoboys) ? motoboys : [];

  const { toast } = useToast();
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedOrderForReassign, setSelectedOrderForReassign] = useState<string | null>(null);
  const [selectedMotoboyForReassign, setSelectedMotoboyForReassign] = useState<string>("");

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/cancel`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Pedido cancelado com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao cancelar pedido", description: error.message, variant: "destructive" });
    },
  });

  const reassignOrderMutation = useMutation({
    mutationFn: async ({ orderId, motoboyId }: { orderId: string; motoboyId: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/reassign`, { motoboyId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Pedido reatribuído com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao reatribuir pedido", description: error.message, variant: "destructive" });
    },
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">📦 Gestão de Pedidos</h2>
      </div>

      <Card className="p-4 mb-6">
        <h3 className="text-sm font-semibold mb-3">🔍 Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data Inicial</label>
            <Input
              type="date"
              className="text-sm dark:text-foreground dark:bg-background dark:[color-scheme:dark]"
              value={orderStartDateFilter}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data Final</label>
            <Input
              type="date"
              className="text-sm dark:text-foreground dark:bg-background dark:[color-scheme:dark]"
              value={orderEndDateFilter}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cliente</label>
            <Select value={orderClientFilter} onValueChange={onClientChange}>
              <SelectTrigger className="text-sm">
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
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Motoboy</label>
            <Select value={orderMotoboyFilter} onValueChange={onMotoboyChange}>
              <SelectTrigger className="text-sm">
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
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <Select value={orderStatusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Pagamento</label>
            <Select value={orderPaymentFilter} onValueChange={onPaymentChange}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Cartão">Cartão</SelectItem>
                <SelectItem value="Pix">Pix</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Buscar</label>
            <Input
              placeholder="Nome, bairro..."
              className="text-sm"
              value={orderSearchFilter}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left">
                <th className="p-3 text-xs font-semibold">Horário</th>
                <th className="p-3 text-xs font-semibold">Cliente</th>
                <th className="p-3 text-xs font-semibold">Motoboy</th>
                <th className="p-3 text-xs font-semibold">Origem</th>
                <th className="p-3 text-xs font-semibold">Destino</th>
                <th className="p-3 text-xs font-semibold text-right">Valor</th>
                <th className="p-3 text-xs font-semibold">Status</th>
                <th className="p-3 text-xs font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {safeOrders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 text-xs whitespace-nowrap">
                    {order.createdAtDate.toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-3 text-xs font-medium">{order.clientName}</td>
                  <td className="p-3 text-xs">{order.motoboyName || "-"}</td>
                  <td className="p-3 text-xs">{order.coletaBairro}</td>
                  <td className="p-3 text-xs">{order.entregaBairro}</td>
                  <td className="p-3 text-xs text-right font-semibold">R$ {order.totalValue.toFixed(2)}</td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] px-2 py-1 rounded-full ${
                        order.status === "pending"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : order.status === "in_progress"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : order.status === "delivered"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {order.status === "pending" && "Pendente"}
                      {order.status === "in_progress" && "Em Rota"}
                      {order.status === "delivered" && "Entregue"}
                      {order.status === "cancelled" && "Cancelado"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {order.status !== "delivered" && order.status !== "cancelled" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2"
                            onClick={() => {
                              setSelectedOrderForReassign(order.id);
                              setReassignDialogOpen(true);
                            }}
                          >
                            Reatribuir
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs h-7 px-2"
                            onClick={() => {
                              if (confirm("Cancelar pedido?")) {
                                cancelOrderMutation.mutate(order.id);
                              }
                            }}
                          >
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reatribuir Pedido</DialogTitle>
            <DialogDescription>Selecione um motoboy para reatribuir este pedido</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedMotoboyForReassign} onValueChange={setSelectedMotoboyForReassign}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um motoboy" />
              </SelectTrigger>
              <SelectContent>
                {safeMotoboys.map((motoboy) => (
                  <SelectItem key={motoboy.id} value={motoboy.id}>
                    {motoboy.name} {motoboy.online ? "(Online)" : "(Offline)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReassignDialogOpen(false);
                setSelectedMotoboyForReassign("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedOrderForReassign && selectedMotoboyForReassign) {
                  reassignOrderMutation.mutate({
                    orderId: selectedOrderForReassign,
                    motoboyId: selectedMotoboyForReassign,
                  });
                  setReassignDialogOpen(false);
                  setSelectedOrderForReassign(null);
                  setSelectedMotoboyForReassign("");
                }
              }}
              disabled={!selectedMotoboyForReassign || reassignOrderMutation.isPending}
            >
              {reassignOrderMutation.isPending ? "Reatribuindo..." : "Reatribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
