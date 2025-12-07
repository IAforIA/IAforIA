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

import { useEffect, useState } from "react";
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
import type { ClientProfileDto } from "@shared/contracts";
import type { Motoboy } from "@shared/schema";

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
  user: { id: string; name: string; phone?: string; email?: string; role?: 'client' | 'motoboy' | 'central' } | null;
  clientProfile?: ClientProfileDto | null;
  motoboyProfile?: Motoboy | null;
}

export function SettingsPage({ user, clientProfile, motoboyProfile }: SettingsPageProps) {
  const { toast } = useToast();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isUploadingClientDoc, setIsUploadingClientDoc] = useState(false);
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const [isUploadingResidence, setIsUploadingResidence] = useState(false);
  const [isUpdatingMotoboy, setIsUpdatingMotoboy] = useState(false);
  const [clientAddress, setClientAddress] = useState(() => clientProfile?.address);
  const [motoboyAddress, setMotoboyAddress] = useState(() => ({
    cep: motoboyProfile?.cep ?? '',
    numero: motoboyProfile?.numero ?? '',
    rua: motoboyProfile?.rua ?? '',
    bairro: motoboyProfile?.bairro ?? '',
    complemento: motoboyProfile?.complemento ?? '',
    referencia: motoboyProfile?.referencia ?? '',
  }));
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [isMotoboyCepLoading, setIsMotoboyCepLoading] = useState(false);

  useEffect(() => {
    if (clientProfile) setClientAddress(clientProfile.address);
  }, [clientProfile]);

  useEffect(() => {
    if (motoboyProfile) {
      setMotoboyAddress({
        cep: motoboyProfile.cep ?? '',
        numero: motoboyProfile.numero ?? '',
        rua: motoboyProfile.rua ?? '',
        bairro: motoboyProfile.bairro ?? '',
        complemento: motoboyProfile.complemento ?? '',
        referencia: motoboyProfile.referencia ?? '',
      });
    }
  }, [motoboyProfile]);

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

  // Mutation for client address/docs update
  const updateClientMutation = useMutation({
    mutationFn: async (data: Partial<ClientProfileDto>) => {
      const res = await apiRequest('PATCH', `/api/clients/me`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me/profile'] });
      toast({ title: "Cadastro atualizado", description: "Dados do cliente salvos com sucesso." });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar cadastro", description: error.message || "Tente novamente.", variant: "destructive" });
    }
  });

  const handleClientDocUpload = async (file?: File | null) => {
    if (!file) return;
    setIsUploadingClientDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/client-doc', { method: 'POST', body: formData });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Falha ao enviar documento');
      }
      toast({ title: 'Documento enviado', description: 'Arquivo salvo com sucesso.' });
      queryClient.invalidateQueries({ queryKey: ['/api/me/profile'] });
    } catch (error: any) {
      toast({ title: 'Erro no upload', description: error.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsUploadingClientDoc(false);
    }
  };

  const handleMotoboyDocUpload = async (file: File | null, tipo: 'license' | 'residence') => {
    if (!file) return;
    if (tipo === 'license') setIsUploadingLicense(true); else setIsUploadingResidence(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', tipo);
      const res = await fetch('/api/upload/motoboy-doc', { method: 'POST', body: formData });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Falha ao enviar documento');
      }
      toast({ title: 'Documento enviado', description: 'Arquivo salvo com sucesso.' });
    } catch (error: any) {
      toast({ title: 'Erro no upload', description: error.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      if (tipo === 'license') setIsUploadingLicense(false); else setIsUploadingResidence(false);
    }
  };

  const handleMotoboyFieldUpdate = async (patch: Partial<Motoboy>) => {
    setIsUpdatingMotoboy(true);
    try {
      const res = await apiRequest('PATCH', '/api/motoboys/me', patch);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Falha ao atualizar dados');
      }
      toast({ title: 'Dados atualizados', description: 'Informações do motoboy salvas.' });
      queryClient.invalidateQueries({ queryKey: ['/api/motoboys/me'] });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsUpdatingMotoboy(false);
    }
  };

  const normalizeCep = (value: string) => value.replace(/\D/g, '').slice(0, 8);

  const applyClientAddressFromCep = async (cepRaw: string) => {
    const cep = normalizeCep(cepRaw);
    if (cep.length !== 8) return;
    setIsCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error('CEP não encontrado');
      const next = {
        cep: data.cep || cepRaw,
        rua: data.logradouro || '',
        bairro: data.bairro || '',
        numero: clientAddress?.numero || '',
        complemento: clientAddress?.complemento || '',
        referencia: clientAddress?.referencia || '',
      };
      setClientAddress((prev) => ({ ...prev, ...next }));
      updateClientMutation.mutate({
        cep: next.cep,
        rua: next.rua,
        bairro: next.bairro,
      });
      toast({ title: 'Endereço preenchido pelo CEP', description: 'Revise número e complemento.' });
    } catch (error: any) {
      toast({ title: 'CEP inválido', description: error.message || 'Não foi possível buscar o CEP.', variant: 'destructive' });
    } finally {
      setIsCepLoading(false);
    }
  };

  const applyMotoboyAddressFromCep = async (cepRaw: string) => {
    const cep = normalizeCep(cepRaw);
    if (cep.length !== 8) return;
    setIsMotoboyCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error('CEP não encontrado');
      const next = {
        cep: data.cep || cepRaw,
        rua: data.logradouro || '',
        bairro: data.bairro || '',
        numero: motoboyAddress?.numero || '',
        complemento: motoboyAddress?.complemento || '',
        referencia: motoboyAddress?.referencia || '',
      };
      setMotoboyAddress((prev) => (prev ? { ...prev, ...next } : next));
      await handleMotoboyFieldUpdate({
        cep: next.cep,
        rua: next.rua,
        bairro: next.bairro,
      });
      toast({ title: 'Endereço preenchido pelo CEP', description: 'Revise número e complemento.' });
    } catch (error: any) {
      toast({ title: 'CEP inválido', description: error.message || 'Não foi possível buscar o CEP.', variant: 'destructive' });
    } finally {
      setIsMotoboyCepLoading(false);
    }
  };

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

      {user?.role === 'client' && clientProfile && clientAddress && (
        <Card className="p-6 max-w-3xl mt-6 space-y-4">
          <h3 className="text-lg font-semibold">Dados do Cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input value={clientProfile.email} disabled className="bg-muted" />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de documento</label>
              <Input value={clientProfile.documentType} disabled className="bg-muted" />
            </div>
            <div>
              <label className="text-sm font-medium">CPF/CNPJ</label>
              <Input value={clientProfile.documentNumber} disabled className="bg-muted" />
            </div>
            <div>
              <label className="text-sm font-medium">Inscrição Estadual (opcional)</label>
              <Input
                defaultValue={clientProfile.ie ?? ''}
                onBlur={(e) => updateClientMutation.mutate({ ie: e.target.value })}
                placeholder="ISENTO / 123456"
              />
            </div>
            <div>
              <label className="text-sm font-medium">CEP</label>
              <Input
                value={clientAddress.cep}
                onChange={(e) => setClientAddress({ ...clientAddress, cep: e.target.value })}
                onBlur={(e) => applyClientAddressFromCep(e.target.value)}
                placeholder="00000-000"
                title="CEP"
                disabled={isCepLoading}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Número</label>
              <Input
                value={clientAddress.numero}
                onChange={(e) => setClientAddress({ ...clientAddress, numero: e.target.value })}
                onBlur={(e) => updateClientMutation.mutate({ numero: e.target.value })}
                placeholder="123"
                title="Número"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Rua / Avenida</label>
              <Input
                value={clientAddress.rua}
                onChange={(e) => setClientAddress({ ...clientAddress, rua: e.target.value })}
                onBlur={(e) => updateClientMutation.mutate({ rua: e.target.value })}
                placeholder="Av. Guriri"
                title="Rua"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Bairro</label>
              <Input
                value={clientAddress.bairro}
                onChange={(e) => setClientAddress({ ...clientAddress, bairro: e.target.value })}
                onBlur={(e) => updateClientMutation.mutate({ bairro: e.target.value })}
                placeholder="Centro"
                title="Bairro"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Complemento</label>
              <Input
                value={clientAddress.complemento ?? ''}
                onChange={(e) => setClientAddress({ ...clientAddress, complemento: e.target.value })}
                onBlur={(e) => updateClientMutation.mutate({ complemento: e.target.value })}
                placeholder="Sala 2 / Bloco"
                title="Complemento"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Referência</label>
              <Input
                value={clientAddress.referencia ?? ''}
                onChange={(e) => setClientAddress({ ...clientAddress, referencia: e.target.value })}
                onBlur={(e) => updateClientMutation.mutate({ referencia: e.target.value })}
                placeholder="Ao lado da praça"
                title="Referência"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Licença / documento da empresa</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleClientDocUpload(e.target.files?.[0])}
              disabled={isUploadingClientDoc}
              title="Upload do documento da empresa"
            />
            <p className="text-xs text-muted-foreground">Envie o comprovante de registro (CNPJ ou CPF).</p>
          </div>
        </Card>
      )}

      {user?.role === 'motoboy' && (
        <Card className="p-6 max-w-2xl mt-6 space-y-4">
          <h3 className="text-lg font-semibold">Documentos do Motoboy</h3>
          {user.email && (
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input value={user.email} disabled className="bg-muted" />
            </div>
          )}

          {motoboyProfile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">CEP</label>
                <Input
                  value={motoboyAddress.cep}
                  onChange={(e) => setMotoboyAddress({ ...motoboyAddress, cep: e.target.value })}
                  onBlur={(e) => applyMotoboyAddressFromCep(e.target.value)}
                  placeholder="00000-000"
                  title="CEP do endereço"
                  disabled={isUpdatingMotoboy || isMotoboyCepLoading}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Número</label>
                <Input
                  value={motoboyAddress.numero}
                  onChange={(e) => setMotoboyAddress({ ...motoboyAddress, numero: e.target.value })}
                  onBlur={(e) => handleMotoboyFieldUpdate({ numero: e.target.value })}
                  placeholder="123"
                  title="Número do endereço"
                  disabled={isUpdatingMotoboy}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rua / Avenida</label>
                <Input
                  value={motoboyAddress.rua}
                  onChange={(e) => setMotoboyAddress({ ...motoboyAddress, rua: e.target.value })}
                  onBlur={(e) => handleMotoboyFieldUpdate({ rua: e.target.value })}
                  placeholder="Rua"
                  title="Rua ou avenida"
                  disabled={isUpdatingMotoboy}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Bairro</label>
                <Input
                  value={motoboyAddress.bairro}
                  onChange={(e) => setMotoboyAddress({ ...motoboyAddress, bairro: e.target.value })}
                  onBlur={(e) => handleMotoboyFieldUpdate({ bairro: e.target.value })}
                  placeholder="Bairro"
                  title="Bairro"
                  disabled={isUpdatingMotoboy}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Complemento</label>
                <Input
                  value={motoboyAddress.complemento}
                  onChange={(e) => setMotoboyAddress({ ...motoboyAddress, complemento: e.target.value })}
                  onBlur={(e) => handleMotoboyFieldUpdate({ complemento: e.target.value })}
                  placeholder="Apto / Bloco"
                  title="Complemento"
                  disabled={isUpdatingMotoboy}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Referência</label>
                <Input
                  value={motoboyAddress.referencia}
                  onChange={(e) => setMotoboyAddress({ ...motoboyAddress, referencia: e.target.value })}
                  onBlur={(e) => handleMotoboyFieldUpdate({ referencia: e.target.value })}
                  placeholder="Ponto de referência"
                  title="Referência"
                  disabled={isUpdatingMotoboy}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">CNH (frente)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleMotoboyDocUpload(e.target.files?.[0] || null, 'license')}
              disabled={isUploadingLicense}
              title="Upload da CNH"
            />
            <p className="text-xs text-muted-foreground">Faça upload da sua CNH válida.</p>
            {motoboyProfile?.licenseUrl && (
              <a href={motoboyProfile.licenseUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                Ver CNH enviada
              </a>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Comprovante de residência</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleMotoboyDocUpload(e.target.files?.[0] || null, 'residence')}
              disabled={isUploadingResidence}
              title="Upload do comprovante de residência"
            />
            <p className="text-xs text-muted-foreground">Conta de luz/água ou documento equivalente.</p>
            {motoboyProfile?.residenceProofUrl && (
              <a href={motoboyProfile.residenceProofUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                Ver comprovante enviado
              </a>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
