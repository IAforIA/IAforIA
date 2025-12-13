/**
 * COMPONENTE: NewConversationDialog
 * PROPÓSITO: Dialog para Central iniciar nova conversa com cliente ou motoboy
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, User, Truck, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface Recipient {
  id: string;
  name: string;
  role: 'client' | 'motoboy';
  phone?: string;
  company?: string;
  online?: boolean;
}

interface RecipientsResponse {
  clients: Recipient[];
  motoboys: Recipient[];
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartConversation: (recipient: Recipient) => void;
}

export function NewConversationDialog({ 
  open, 
  onOpenChange, 
  onStartConversation 
}: NewConversationDialogProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'clients' | 'motoboys'>('clients');

  // Buscar destinatários quando o dialog abre
  const { data, isLoading, error, refetch } = useQuery<RecipientsResponse>({
    queryKey: ['/api/chat/recipients'],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: open,
  });

  // Reset search quando abre
  useEffect(() => {
    if (open) {
      setSearch("");
      refetch();
    }
  }, [open, refetch]);

  const clients = data?.clients || [];
  const motoboys = data?.motoboys || [];

  // Filtrar por busca
  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredMotoboys = motoboys.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (recipient: Recipient) => {
    onStartConversation(recipient);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💬 Nova Conversa
          </DialogTitle>
          <DialogDescription>
            Selecione um cliente ou motoboy para iniciar uma nova conversa
          </DialogDescription>
        </DialogHeader>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'clients' | 'motoboys')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Clientes ({filteredClients.length})
            </TabsTrigger>
            <TabsTrigger value="motoboys" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Motoboys ({filteredMotoboys.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="flex-1 mt-3 min-h-0">
            <ScrollArea className="h-[280px]">
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-center text-red-500 py-8 text-sm">
                  Erro ao carregar clientes
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  Nenhum cliente encontrado
                </div>
              ) : (
                <div className="space-y-2 pr-3">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleSelect(client)}
                      className="w-full p-3 text-left rounded-lg border hover:bg-accent hover:border-primary transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{client.name}</div>
                          {client.company && (
                            <div className="text-xs text-muted-foreground truncate">{client.company}</div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0">Cliente</Badge>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="motoboys" className="flex-1 mt-3 min-h-0">
            <ScrollArea className="h-[280px]">
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-center text-red-500 py-8 text-sm">
                  Erro ao carregar motoboys
                </div>
              ) : filteredMotoboys.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  Nenhum motoboy encontrado
                </div>
              ) : (
                <div className="space-y-2 pr-3">
                  {filteredMotoboys.map((motoboy) => (
                    <button
                      key={motoboy.id}
                      onClick={() => handleSelect(motoboy)}
                      className="w-full p-3 text-left rounded-lg border hover:bg-accent hover:border-primary transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0">
                          <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate flex items-center gap-2">
                            {motoboy.name}
                            {motoboy.online && (
                              <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Online" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {motoboy.online ? 'Online' : 'Offline'}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0">Motoboy</Badge>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
