import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { ExternalLink, Package } from "lucide-react";
import type { HistoryProps } from "./types";
import { parseDecimalSafe } from "./utils";

export function History({ deliveredOrders }: HistoryProps) {
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
            {filtered.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{order.coletaBairro}</TableCell>
                <TableCell>{order.entregaBairro}</TableCell>
                <TableCell>R$ {parseDecimalSafe(order.taxaMotoboy).toFixed(2)}</TableCell>
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
                    <Badge variant="outline" className="text-muted-foreground">-</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
