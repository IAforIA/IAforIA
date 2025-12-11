import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [driverDetailsOpen, setDriverDetailsOpen] = useState(false);
  const [selectedDriverDetails, setSelectedDriverDetails] = useState<Motoboy | null>(null);
  const [createDriverOpen, setCreateDriverOpen] = useState(false);

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
        <Button onClick={() => setCreateDriverOpen(true)}>
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
                <th className="text-left p-4 font-semibold">Documentos</th>
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
                    <td className="p-4 text-sm space-y-1">
                      {motoboy.licenseUrl ? (
                        <div>
                          <a
                            href={motoboy.licenseUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                          >
                            CNH
                          </a>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">CNH —</div>
                      )}
                      {motoboy.residenceProofUrl ? (
                        <div>
                          <a
                            href={motoboy.residenceProofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                          >
                            Comprovante
                          </a>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">Comprovante —</div>
                      )}
                    </td>
                    <td className="p-4">{activeOrders}</td>
                    <td className="p-4 text-sm">
                      {motoboy.updatedAt ? new Date(motoboy.updatedAt).toLocaleString("pt-BR") : "-"}
                    </td>
                    <td className="p-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDriverDetails(motoboy);
                          setDriverDetailsOpen(true);
                        }}
                      >
                        Ver detalhes
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

      <Dialog open={createDriverOpen} onOpenChange={setCreateDriverOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo Motoboy</DialogTitle>
            <DialogDescription>Cadastre um entregador com dados básicos.</DialogDescription>
          </DialogHeader>
          <CreateMotoboyForm
            onSuccess={() => {
              setCreateDriverOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/motoboys"] });
            }}
            onError={(message) => toast({ title: "Erro ao criar motoboy", description: message, variant: "destructive" })}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={driverDetailsOpen} onOpenChange={setDriverDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Motoboy</DialogTitle>
            <DialogDescription>Contato, endereço, documentos e agenda completa.</DialogDescription>
          </DialogHeader>
          {selectedDriverDetails && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{selectedDriverDetails.name}</p>
                  <p className="text-sm text-muted-foreground">Placa: {selectedDriverDetails.placa || "—"}</p>
                  <p className="text-sm text-muted-foreground">CPF: {selectedDriverDetails.cpf || "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <DriverAvailabilityBadge motoboyId={selectedDriverDetails.id} />
                  <Badge variant={selectedDriverDetails.available === false ? "destructive" : "secondary"}>
                    {selectedDriverDetails.available === false ? "Indisponível" : "Disponível"}
                  </Badge>
                  <Badge variant={selectedDriverDetails.online ? "default" : "outline"}>
                    {selectedDriverDetails.online ? "Online" : "Offline"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="p-3 space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Contato</p>
                  <p className="text-sm">Telefone: {selectedDriverDetails.phone || "—"}</p>
                  <p className="text-sm">Pedidos ativos: {activeOrdersByDriver[selectedDriverDetails.id] || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    Atualizado: {selectedDriverDetails.updatedAt ? new Date(selectedDriverDetails.updatedAt).toLocaleString("pt-BR") : "—"}
                  </p>
                </Card>

                <Card className="p-3 space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Endereço</p>
                  <p className="text-sm">
                    {selectedDriverDetails.rua || "—"}, {selectedDriverDetails.numero || "s/n"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDriverDetails.bairro || ""} {selectedDriverDetails.cep ? `• CEP ${selectedDriverDetails.cep}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDriverDetails.complemento || selectedDriverDetails.referencia || "Sem complemento"}
                  </p>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="p-3 space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Documentos</p>
                  <div className="flex flex-col gap-1 text-sm">
                    <span>
                      CNH: {selectedDriverDetails.licenseUrl ? (
                        <a href={selectedDriverDetails.licenseUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">abrir</a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                    <span>
                      Comprovante: {selectedDriverDetails.residenceProofUrl ? (
                        <a href={selectedDriverDetails.residenceProofUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">abrir</a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                  </div>
                </Card>

                <Card className="p-3">
                  <p className="text-xs uppercase text-muted-foreground mb-2">Agenda</p>
                  <DriverScheduleViewer motoboyId={selectedDriverDetails.id} motoboyName={selectedDriverDetails.name} compact={true} />
                </Card>
              </div>

              <Card className="p-3">
                <p className="text-xs uppercase text-muted-foreground mb-2">Agenda Completa</p>
                <DriverScheduleViewer motoboyId={selectedDriverDetails.id} motoboyName={selectedDriverDetails.name} compact={false} />
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDriverDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type CreateMotoboyFormProps = {
  onSuccess: () => void;
  onError: (message: string) => void;
};

function CreateMotoboyForm({ onSuccess, onError }: CreateMotoboyFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [placa, setPlaca] = useState("");
  const [cpf, setCpf] = useState("");
  const [taxaPadrao, setTaxaPadrao] = useState("7.00");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [residenceProofUrl, setResidenceProofUrl] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        phone,
        placa,
        cpf,
        taxaPadrao,
        licenseUrl: licenseUrl || undefined,
        residenceProofUrl: residenceProofUrl || undefined,
      };
      const res = await apiRequest("POST", "/api/motoboys", payload);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível criar o motoboy");
      }
      return res.json();
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      onError(error.message || "Erro ao criar motoboy");
    },
  });

  const canSubmit = Boolean(name && phone);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">Nome</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
        </div>
        <div>
          <label className="text-xs font-medium">Telefone</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium">Placa</label>
          <Input value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="ABC-1234" />
        </div>
        <div>
          <label className="text-xs font-medium">CPF</label>
          <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="Somente números" />
        </div>
        <div>
          <label className="text-xs font-medium">Taxa Padrão</label>
          <Input value={taxaPadrao} onChange={(e) => setTaxaPadrao(e.target.value)} placeholder="7.00" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">URL CNH (opcional)</label>
          <Input value={licenseUrl} onChange={(e) => setLicenseUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label className="text-xs font-medium">URL Comprovante (opcional)</label>
          <Input value={residenceProofUrl} onChange={(e) => setResidenceProofUrl(e.target.value)} placeholder="https://..." />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => mutation.reset()} disabled={mutation.isPending}>Limpar</Button>
        <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
