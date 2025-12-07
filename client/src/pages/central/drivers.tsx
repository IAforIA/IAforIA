import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DriverAvailabilityBadge, DriverScheduleViewer } from "@/components/DriverScheduleViewer";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Motoboy } from "@shared/schema";

interface DriversRouteProps {
  motoboys: Motoboy[];
  activeOrdersByDriver: Record<string, number>;
}

export function DriversRoute({ motoboys, activeOrdersByDriver }: DriversRouteProps) {
  const { toast } = useToast();
  const [driverSearch, setDriverSearch] = useState("");
  const [driverAvailabilityFilter, setDriverAvailabilityFilter] = useState("");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<{ id: string; name: string } | null>(null);

  const toggleMotoboyOnlineMutation = useMutation({
    mutationFn: async ({ motoboyId, online }: { motoboyId: string; online: boolean }) => {
      const res = await apiRequest("PATCH", `/api/motoboys/${motoboyId}/online`, { online });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/motoboys"] });
      toast({ title: "Status do motoboy atualizado" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    },
  });

  const filteredDrivers = useMemo(() => {
    return motoboys.filter((motoboy) => {
      const activeOrders = activeOrdersByDriver[motoboy.id] || 0;
      const isAvailable = motoboy.available !== false && activeOrders === 0;
      const isBusy = activeOrders > 0 || motoboy.available === false;

      const passesAvailability = driverAvailabilityFilter === "available" ? isAvailable : driverAvailabilityFilter === "busy" ? isBusy : true;

      if (!driverSearch.trim()) return passesAvailability;
      const term = driverSearch.toLowerCase();
      const matchesSearch =
        motoboy.name.toLowerCase().includes(term) ||
        (motoboy.phone || "").toLowerCase().includes(term) ||
        (motoboy.placa || "").toLowerCase().includes(term);

      return passesAvailability && matchesSearch;
    });
  }, [motoboys, activeOrdersByDriver, driverAvailabilityFilter, driverSearch]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Gestão de Motoboys</h2>
        <Button>
          Novo Motoboy
        </Button>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex gap-4">
          <Input
            placeholder="Buscar por nome ou telefone..."
            className="flex-1"
            value={driverSearch}
            onChange={(e) => setDriverSearch(e.target.value)}
          />
          <select
            className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
            aria-label="Filtrar por disponibilidade"
            value={driverAvailabilityFilter}
            onChange={(e) => setDriverAvailabilityFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="available">Disponíveis</option>
            <option value="busy">Ocupados</option>
          </select>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="text-left p-4 font-semibold">Nome</th>
                <th className="text-left p-4 font-semibold">Telefone</th>
                <th className="text-left p-4 font-semibold">Placa</th>
                <th className="text-left p-4 font-semibold">Situação</th>
                <th className="text-left p-4 font-semibold">Disponibilidade</th>
                <th className="text-left p-4 font-semibold">Pedidos Ativos</th>
                <th className="text-left p-4 font-semibold">Última Atualização</th>
                <th className="text-left p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((motoboy) => {
                const activeOrders = activeOrdersByDriver[motoboy.id] || 0;
                return (
                  <tr key={motoboy.id} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-medium">{motoboy.name}</td>
                    <td className="p-4">{motoboy.phone}</td>
                    <td className="p-4 font-mono">{motoboy.placa}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            motoboy.online ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {motoboy.online ? "Online" : "Offline"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleMotoboyOnlineMutation.mutate({ motoboyId: motoboy.id, online: !motoboy.online })
                          }
                          className="h-6 px-2 text-xs"
                        >
                          {motoboy.online ? "Desativar" : "Ativar"}
                        </Button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <DriverAvailabilityBadge motoboyId={motoboy.id} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDriver({ id: motoboy.id, name: motoboy.name });
                            setScheduleDialogOpen(true);
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          Ver schedule
                        </Button>
                      </div>
                    </td>
                    <td className="p-4">{activeOrders}</td>
                    <td className="p-4 text-sm">
                      {motoboy.updatedAt ? new Date(motoboy.updatedAt).toLocaleString("pt-BR") : "-"}
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Disponibilidade do Motoboy</DialogTitle>
            <DialogDescription>Visualização completa da disponibilidade semanal</DialogDescription>
          </DialogHeader>
          {selectedDriver && (
            <DriverScheduleViewer motoboyId={selectedDriver.id} motoboyName={selectedDriver.name} compact={false} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
