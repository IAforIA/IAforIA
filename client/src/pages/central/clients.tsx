import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientStatusBadge } from "@/components/ClientStatusBadge";
import { ClientScheduleViewer } from "@/components/ClientScheduleViewer";
import type { Client } from "@shared/schema";
import type { NormalizedOrder } from "./types";

interface ClientsRouteProps {
  clients: Client[];
  allClientSchedules: any[];
  normalizedOrders: NormalizedOrder[];
}

export function ClientsRoute({ clients, allClientSchedules, normalizedOrders }: ClientsRouteProps) {
  const schedules = allClientSchedules || [];
  const orders = normalizedOrders || [];
  const [clientSearch, setClientSearch] = useState("");
  const [clientScheduleDialogOpen, setClientScheduleDialogOpen] = useState(false);
  const [selectedClientForSchedule, setSelectedClientForSchedule] = useState<{ id: string; name: string } | null>(null);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const term = clientSearch.toLowerCase();
    return clients.filter((client) =>
      client.name.toLowerCase().includes(term) ||
      (client.phone || "").toLowerCase().includes(term) ||
      (client.email || "").toLowerCase().includes(term)
    );
  }, [clientSearch, clients]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Gestão de Clientes</h2>
        <div className="flex gap-2 items-center">
          <Badge variant="outline" className="text-xs">
            {schedules.length} horários carregados
          </Badge>
          <Button>
            Novo Cliente
          </Button>
        </div>
      </div>

      <Card className="p-4 mb-6">
        <Input
          placeholder="Buscar por nome, telefone ou email..."
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
        />
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="text-left p-4 font-semibold">Nome</th>
                <th className="text-left p-4 font-semibold">Telefone</th>
                <th className="text-left p-4 font-semibold">Email</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Pedidos</th>
                <th className="text-left p-4 font-semibold">Cadastro</th>
                <th className="text-left p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr className="border-b">
                  <td className="p-4 text-muted-foreground text-center" colSpan={7}>
                    Nenhum cliente cadastrado
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const clientSchedules = schedules.filter((s: any) => String(s.clientId) === String(client.id));
                  return (
                    <tr key={client.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">{client.name}</td>
                      <td className="p-4">{client.phone}</td>
                      <td className="p-4">{client.email}</td>
                      <td className="p-4">
                        <button
                          title="Ver horários do cliente"
                          onClick={() => {
                            setSelectedClientForSchedule({ id: client.id, name: client.name });
                            setClientScheduleDialogOpen(true);
                          }}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <ClientStatusBadge clientId={client.id} schedules={clientSchedules} />
                        </button>
                      </td>
                      <td className="p-4">
                        {orders.filter((o) => o.clientId === client.id).length}
                      </td>
                      <td className="p-4 text-sm">{new Date(client.createdAt).toLocaleDateString("pt-BR")}</td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedClientForSchedule({ id: client.id, name: client.name });
                            setClientScheduleDialogOpen(true);
                          }}
                        >
                          Ver Horários
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={clientScheduleDialogOpen} onOpenChange={setClientScheduleDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Horário de Funcionamento</DialogTitle>
            <DialogDescription>{selectedClientForSchedule?.name}</DialogDescription>
          </DialogHeader>
          {selectedClientForSchedule && (
            <ClientScheduleViewer
              clientId={selectedClientForSchedule.id}
              clientName={selectedClientForSchedule.name}
              schedules={schedules.filter((s: any) => String(s.clientId) === String(selectedClientForSchedule.id))}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientScheduleDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
