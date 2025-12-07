import { Card } from "@/components/ui/card";
import OrderCard from "@/components/OrderCard";
import type { Order, OrderStatus } from "@shared/schema";
import { TruckIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { DeliverDialog } from "./deliver-dialog";
import type { MyDeliveriesProps } from "./types";

export function MyDeliveries({ orders, token, onDeliver, isDelivering }: MyDeliveriesProps) {
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    return orders.filter((order) => {
      const matchesPayment = paymentFilter === "all" || order.formaPagamento === paymentFilter;
      const matchesSearch =
        !normalizedSearch ||
        `${order.coletaBairro} ${order.entregaBairro} ${order.coletaRua} ${order.entregaRua}`
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesPayment && matchesSearch;
    });
  }, [orders, paymentFilter, search]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-lg font-semibold">Minhas Entregas Ativas</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input
            placeholder="Buscar por bairro ou rua"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-56"
          />
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full sm:w-36">
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
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <TruckIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Você não tem entregas ativas. Aceite uma entrega para começar.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((order) => (
            <Card key={order.id} className="p-4">
              <OrderCard
                id={order.id}
                origin={`${order.coletaRua}, ${order.coletaNumero} - ${order.coletaBairro}`}
                destination={`${order.entregaRua}, ${order.entregaNumero} - ${order.entregaBairro}`}
                status={order.status as OrderStatus}
                value={order.valor}
                formaPagamento={order.formaPagamento}
                hasTroco={order.hasTroco ?? undefined}
                trocoValor={order.trocoValor}
                complemento={order.coletaComplemento || undefined}
                referencia={order.referencia || undefined}
                observacoes={order.observacoes || undefined}
                produtoNome={order.produtoNome || undefined}
                produtoQuantidade={order.produtoQuantidade || undefined}
                produtoPrecoUnitario={order.produtoPrecoUnitario || undefined}
                produtoValorTotal={order.produtoValorTotal || undefined}
              />
              <DeliverDialog
                order={order}
                token={token}
                onDeliver={onDeliver}
                isDelivering={isDelivering}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
