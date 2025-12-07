import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { Package, ExternalLink } from "lucide-react";
import type { Order } from "@shared/schema";

interface HistorySectionProps {
  deliveredOrders: Order[];
}

export function HistorySection({ deliveredOrders }: HistorySectionProps) {
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const filtered = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    return deliveredOrders.filter((order) => {
      const createdDate = new Date(order.createdAt);
      const createdDateString = Number.isNaN(createdDate.getTime()) ? "" : createdDate.toISOString().slice(0, 10);
      const matchesPayment = paymentFilter === "all" || order.formaPagamento === paymentFilter;
      const matchesDate = !dateFilter || createdDateString === dateFilter;
      const matchesSearch =
        !normalizedSearch ||
        `${order.coletaBairro} ${order.entregaBairro} ${order.coletaRua} ${order.entregaRua}`
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesPayment && matchesDate && matchesSearch;
    });
  }, [deliveredOrders, paymentFilter, dateFilter, search]);

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-xl font-semibold">Histórico de Entregas</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-40"
          />
          <Input
            placeholder="Buscar por bairro ou rua"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-48"
          />
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
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma entrega finalizada ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Data</TableHead>
                <TableHead className="whitespace-nowrap">Origem</TableHead>
                <TableHead className="whitespace-nowrap">Destino</TableHead>
                <TableHead className="whitespace-nowrap">Valor</TableHead>
                <TableHead className="whitespace-nowrap">Motoboy</TableHead>
                <TableHead className="whitespace-nowrap">Comprovante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="max-w-[150px] sm:max-w-[200px] truncate" title={`${order.coletaRua}, ${order.coletaNumero}`}>
                    {order.coletaRua}, {order.coletaNumero}
                  </TableCell>
                  <TableCell className="max-w-[150px] sm:max-w-[200px] truncate" title={`${order.entregaRua}, ${order.entregaNumero}`}>
                    {order.entregaRua}, {order.entregaNumero}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">R$ {Number(order.valor).toFixed(2)}</TableCell>
                  <TableCell className="whitespace-nowrap">{order.motoboyName || '-'}</TableCell>
                  <TableCell>
                    {order.proofUrl ? (
                      <a
                        href={order.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-500 hover:underline whitespace-nowrap"
                      >
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
        </div>
      )}
    </Card>
  );
}
