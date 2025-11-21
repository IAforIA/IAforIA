/**
 * ARQUIVO: client/src/components/SettingsPage.tsx
 * PROPÓSITO: Página de configurações de perfil reutilizável para todos os usuários
 * 
 * FUNCIONALIDADES:
 * - Edição de nome e telefone
 * - Alteração de senha com confirmação
 * - Validação com React Hook Form + Zod
 * - Mutation com React Query
 * - Toast notifications para feedback
 * 
 * SEGURANÇA:
 * - Apenas usuário autenticado pode editar próprio perfil
 * - Senha requer mínimo 8 caracteres
 * - Confirmação de senha obrigatória
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";

// Schema for profile info (name, phone)
const profileInfoSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  phone: z.string().min(10, "Telefone inválido"),
});

type ProfileInfoData = z.infer<typeof profileInfoSchema>;

// Schema for password change
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  confirmPassword: z.string().min(8, "Confirmação é obrigatória"),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  }
);

type PasswordChangeData = z.infer<typeof passwordChangeSchema>;

interface SettingsPageProps {
  user: { id: string; name: string; phone?: string; email?: string } | null;
}

export function SettingsPage({ user }: SettingsPageProps) {
  const { toast } = useToast();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Form for profile info
  const profileForm = useForm<ProfileInfoData>({
    resolver: zodResolver(profileInfoSchema),
    defaultValues: {
      name: user?.name || "",
      phone: user?.phone || "",
    },
  });

  // Form for password change
  const passwordForm = useForm<PasswordChangeData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Mutation for updating profile info
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileInfoData) => {
      const res = await apiRequest('PATCH', `/api/users/${user?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      toast({
        title: "Perfil atualizado com sucesso!",
        description: "Suas informações foram salvas.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  // Mutation for changing password
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeData) => {
      // Note: We're sending newPassword as 'password' to match backend expectation
      const res = await apiRequest('PATCH', `/api/users/${user?.id}`, {
        password: data.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Senha alterada com sucesso!",
        description: "Use sua nova senha no próximo login.",
      });
      passwordForm.reset();
      setShowPasswordForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <Card className="p-6 max-w-2xl">
        <p className="text-muted-foreground">Carregando informações do usuário...</p>
      </Card>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-6">Configurações da Conta</h2>

      {/* Profile Information Form */}
      <Card className="p-6 max-w-2xl mb-6">
        <h3 className="text-lg font-semibold mb-4">Informações Pessoais</h3>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
            <FormField
              control={profileForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Seu nome completo" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {user.email && (
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input type="email" value={user.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">Email não pode ser alterado</p>
              </div>
            )}

            <FormField
              control={profileForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="(00) 00000-0000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => profileForm.reset()}
                disabled={updateProfileMutation.isPending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </Card>

      {/* Password Change Form */}
      <Card className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Segurança</h3>
          {!showPasswordForm && (
            <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(true)}>
              Alterar Senha
            </Button>
          )}
        </div>

        {showPasswordForm ? (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha Atual</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    passwordForm.reset();
                    setShowPasswordForm(false);
                  }}
                  disabled={changePasswordMutation.isPending}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Clique em "Alterar Senha" para modificar suas credenciais de acesso.
          </p>
        )}
      </Card>
    </>
  );
}
