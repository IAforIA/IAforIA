import { useMutation } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserCog, ShieldCheck, Ban } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UsersRouteProps {
  usersData: any[];
  currentUser?: { id: string; role: string } | null;
}

export function UsersRoute({ usersData, currentUser }: UsersRouteProps) {
  const safeUsers = Array.isArray(usersData) ? usersData : [];
  const { toast } = useToast();

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Status atualizado com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    },
  });

  const changeUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Função alterada com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao alterar função", description: error.message, variant: "destructive" });
    },
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <UserCog className="h-6 w-6" />
          Gestão de Usuários
        </h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Função</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhum usuário encontrado
              </TableCell>
            </TableRow>
          ) : (
            safeUsers.map((userData: any) => {
              const isCurrentUser = userData.id === currentUser?.id;
              const roleIcon = userData.role === "central" ? <Shield className="h-4 w-4 text-blue-500" /> : userData.role === "motoboy" ? <UserCog className="h-4 w-4 text-green-500" /> : <UserCog className="h-4 w-4 text-gray-500" />;

              return (
                <TableRow key={userData.id}>
                  <TableCell className="font-medium">
                    {userData.nome}
                    {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                  </TableCell>
                  <TableCell>{userData.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {roleIcon}
                      {isCurrentUser ? (
                        <span className="capitalize">{userData.role}</span>
                      ) : (
                        <Select value={userData.role} onValueChange={(newRole) => changeUserRoleMutation.mutate({ userId: userData.id, role: newRole })}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client">Cliente</SelectItem>
                            <SelectItem value="motoboy">Motoboy</SelectItem>
                            <SelectItem value="central">Central</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {userData.status === "active" ? (
                      <Badge variant="default" className="bg-green-500">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <Ban className="h-3 w-3 mr-1" />
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isCurrentUser ? (
                      <span className="text-xs text-muted-foreground">Não pode editar próprio status</span>
                    ) : (
                      <Button
                        variant={userData.status === "active" ? "destructive" : "default"}
                        size="sm"
                        onClick={() => {
                          const newStatus = userData.status === "active" ? "inactive" : "active";
                          toggleUserStatusMutation.mutate({ userId: userData.id, status: newStatus });
                        }}
                      >
                        {userData.status === "active" ? (
                          <>
                            <Ban className="h-3 w-3 mr-1" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Ativar
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </>
  );
}
