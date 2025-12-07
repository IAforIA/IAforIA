import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ExternalLink } from "lucide-react";
import type { LiveDocsProps } from "./types";

export function LiveDocs({ deliveredOrders }: LiveDocsProps) {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d" | "all">("all");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [query, setQuery] = useState("");

  const searchOptions = useMemo(() => {
    if (!Array.isArray(deliveredOrders)) return [];
    const set = new Set<string>();
    deliveredOrders.forEach((o) => {
      if (o.id) set.add(o.id);
      if (o.clientName) set.add(o.clientName);
    });
    return Array.from(set).sort();
  }, [deliveredOrders]);

  const ordersWithProof = useMemo(() => {
    if (!Array.isArray(deliveredOrders)) return [];
    const now = Date.now();
    const periodDays = period === "24h" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : null;
    return deliveredOrders
      .filter((o) => o.proofUrl)
      .filter((o) => {
        if (!periodDays) return true;
        if (!o.deliveredAt) return false;
        return now - new Date(o.deliveredAt).getTime() <= periodDays * 24 * 60 * 60 * 1000;
      })
      .filter((o) => {
        if (!query.trim()) return true;
        const term = query.toLowerCase();
        return o.id.toLowerCase().includes(term) || (o.clientName || "").toLowerCase().includes(term);
      })
      .sort((a, b) => {
        const da = a.deliveredAt ? new Date(a.deliveredAt).getTime() : 0;
        const db = b.deliveredAt ? new Date(b.deliveredAt).getTime() : 0;
        return sort === "desc" ? db - da : da - db;
      });
  }, [deliveredOrders, period, query, sort]);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Meus Comprovantes</h2>
          <p className="text-sm text-muted-foreground">Filtre por período e pesquise por cliente ou número do pedido.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="sm:w-[140px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="sm:w-[140px]">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Mais recente</SelectItem>
              <SelectItem value="asc">Mais antigo</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Buscar cliente ou pedido"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:w-[220px]"
            list="live-docs-driver-options"
          />
        </div>
      </div>

      <datalist id="live-docs-driver-options">
        {searchOptions.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ordersWithProof.map((order) => (
          <Card key={order.id} className="p-3 space-y-3">
            <div className="rounded-md overflow-hidden border bg-muted/50 aspect-[4/3] flex items-center justify-center">
              <img
                src={order.proofUrl || ""}
                alt={`Comprovante Pedido #${order.id}`}
                className="object-contain w-full h-full"
                loading="lazy"
              />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Pedido #{order.id.slice(0, 8)}</span>
                <Badge variant="outline">
                  {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : "-"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium truncate">{order.clientName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Motoboy</p>
                  <p className="font-medium truncate">{order.motoboyName || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="secondary">Entregue</Badge>
              </div>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <a href={order.proofUrl || "#"} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver original
              </a>
            </Button>
          </Card>
        ))}

        {ordersWithProof.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground text-sm">
            Nenhum comprovante disponível no período selecionado.
          </div>
        )}
      </div>
    </Card>
  );
}
