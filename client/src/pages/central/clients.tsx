import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientStatusBadge } from "@/components/ClientStatusBadge";
import { ClientScheduleViewer } from "@/components/ClientScheduleViewer";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";
import type { NormalizedOrder } from "./types";

interface ClientsRouteProps {
  clients: Client[];
  allClientSchedules: any[];
  normalizedOrders: NormalizedOrder[];
}

export function ClientsRoute({ clients, allClientSchedules, normalizedOrders }: ClientsRouteProps) {
  const { toast } = useToast();
  const schedules = allClientSchedules || [];
  const orders = normalizedOrders || [];
  const [clientSearch, setClientSearch] = useState("");
  const [clientScheduleDialogOpen, setClientScheduleDialogOpen] = useState(false);
  const [selectedClientForSchedule, setSelectedClientForSchedule] = useState<{ id: string; name: string } | null>(null);
  const [clientDetailsDialogOpen, setClientDetailsDialogOpen] = useState(false);
  const [selectedClientDetails, setSelectedClientDetails] = useState<Client | null>(null);
  const [createClientOpen, setCreateClientOpen] = useState(false);

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
          <Button onClick={() => setCreateClientOpen(true)}>
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
                <th className="text-left p-4 font-semibold">Documentos</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Pedidos</th>
                <th className="text-left p-4 font-semibold">Cadastro</th>
                <th className="text-left p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr className="border-b">
                  <td className="p-4 text-muted-foreground text-center" colSpan={8}>
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
                        {client.documentFileUrl ? (
                          <a
                            href={client.documentFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-blue-600 underline"
                          >
                            Ver documento
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem arquivo</span>
                        )}
                      </td>
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
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClientDetails(client);
                            setClientDetailsDialogOpen(true);
                          }}
                        >
                          Ver Detalhes
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

      <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>Cadastre um novo cliente com endereço e horário.</DialogDescription>
          </DialogHeader>
          <CreateClientForm
            onSuccess={() => {
              setCreateClientOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
            }}
            onError={(message) => toast({ title: "Erro ao criar cliente", description: message, variant: "destructive" })}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={clientDetailsDialogOpen} onOpenChange={setClientDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>Dados cadastrais, endereço e horários.</DialogDescription>
          </DialogHeader>
          {selectedClientDetails && (
            <div className="space-y-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{selectedClientDetails.name}</p>
                  <p className="text-muted-foreground">{selectedClientDetails.company || "Razão social não informada"}</p>
                </div>
                <Badge variant="outline">ID {selectedClientDetails.id}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Contato</p>
                  <p>Telefone: {selectedClientDetails.phone || "—"}</p>
                  <p>Email: {selectedClientDetails.email || "—"}</p>
                  <p>Documento: {selectedClientDetails.documentType || "—"} {selectedClientDetails.documentNumber || ""}</p>
                  <p>IE: {selectedClientDetails.ie || "—"}</p>
                  <p>Mensalidade: {selectedClientDetails.mensalidade ? `R$ ${Number(selectedClientDetails.mensalidade).toFixed(2)}` : "—"}</p>
                  <p className="text-xs text-muted-foreground">Criado em: {selectedClientDetails.createdAt ? new Date(selectedClientDetails.createdAt).toLocaleString("pt-BR") : "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Endereço</p>
                  <p>{selectedClientDetails.rua || "—"}, {selectedClientDetails.numero || "s/n"}</p>
                  <p className="text-muted-foreground">{selectedClientDetails.bairro || ""} {selectedClientDetails.cep ? `• CEP ${selectedClientDetails.cep}` : ""}</p>
                  <p className="text-muted-foreground">{selectedClientDetails.complemento || selectedClientDetails.referencia || "Sem complemento"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase text-muted-foreground">Documentos</p>
                {selectedClientDetails.documentFileUrl ? (
                  <a
                    href={selectedClientDetails.documentFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    Abrir documento cadastrado
                  </a>
                ) : (
                  <p className="text-muted-foreground">Nenhum arquivo anexado.</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase text-muted-foreground">Horários</p>
                <ClientScheduleViewer
                  clientId={selectedClientDetails.id}
                  clientName={selectedClientDetails.name}
                  schedules={schedules.filter((s: any) => String(s.clientId) === String(selectedClientDetails.id))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDetailsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type CreateClientFormProps = {
  onSuccess: () => void;
  onError: (message: string) => void;
};

function CreateClientForm({ onSuccess, onError }: CreateClientFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [documentType, setDocumentType] = useState("PF");
  const [documentNumber, setDocumentNumber] = useState("");
  const [ie, setIe] = useState("");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [complemento, setComplemento] = useState("");
  const [referencia, setReferencia] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        email,
        phone,
        password,
        documentType,
        documentNumber,
        ie: documentType === "PJ" ? ie : undefined,
        address: { cep, rua, numero, bairro, complemento, referencia },
      };
      const res = await apiRequest("POST", "/api/clients", payload);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível criar o cliente");
      }
      return res.json();
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      onError(error.message || "Erro ao criar cliente");
    },
  });

  const canSubmit = Boolean(name && email && phone && password && documentNumber && cep && rua && numero && bairro);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">Nome</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Razão social ou fantasia" />
        </div>
        <div>
          <label className="text-xs font-medium">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@cliente.com" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">Telefone</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
        </div>
        <div>
          <label className="text-xs font-medium">Senha (min 8)</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium">Tipo de Documento</label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Tipo de documento"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          >
            <option value="PF">PF</option>
            <option value="PJ">PJ</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Documento (CPF/CNPJ)</label>
          <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="Somente números" />
        </div>
        <div>
          <label className="text-xs font-medium">IE (PJ)</label>
          <Input value={ie} onChange={(e) => setIe(e.target.value)} disabled={documentType !== "PJ"} placeholder="Opcional" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium">CEP</label>
          <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
        </div>
        <div>
          <label className="text-xs font-medium">Rua</label>
          <Input value={rua} onChange={(e) => setRua(e.target.value)} placeholder="Rua/Avenida" />
        </div>
        <div>
          <label className="text-xs font-medium">Número</label>
          <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="123" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">Bairro</label>
          <Input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" />
        </div>
        <div>
          <label className="text-xs font-medium">Complemento / Referência</label>
          <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Sala, Apto" />
          <Input className="mt-2" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ponto de referência" />
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
