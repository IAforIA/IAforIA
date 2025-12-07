import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch as UiSwitch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ClientProfileDto } from "@shared/contracts";
import type { ClientScheduleEntry } from "./types";

const orderSchema = z.object({
  coletaRua: z.string().min(3, "Rua é obrigatória"),
  coletaNumero: z.string().min(1, "Número é obrigatório"),
  coletaBairro: z.string().min(3, "Bairro é obrigatória"),
  coletaCep: z.string().default("29900-000"),
  coletaOverride: z.boolean().default(false),
  coletaComplemento: z.string().optional(),
  referencia: z.string().optional(),
  entregaRua: z.string().min(3, "Rua é obrigatória"),
  entregaNumero: z.string().min(1, "Número é obrigatório"),
  entregaBairro: z.string().min(3, "Bairro é obrigatória"),
  entregaCep: z.string().default("29900-000"),
  entregaComplemento: z.string().optional(),
  observacoes: z.string().optional(),
  produtoNome: z.string().optional(),
  produtoQuantidade: z.number().positive().optional(),
  produtoPrecoUnitario: z.number().positive().optional(),
  produtoValorTotal: z.number().positive().optional(),
  valor: z.number({ required_error: "Selecione o valor da entrega" }).positive("Valor deve ser positivo"),
  formaPagamento: z.enum(["dinheiro", "cartao", "pix"], {
    required_error: "Forma de pagamento é obrigatória",
  }),
  hasTroco: z.boolean().default(false),
  trocoValor: z.number().optional(),
}).refine(
  (data) => {
    if (data.formaPagamento === "dinheiro" && data.hasTroco && !data.trocoValor) {
      return false;
    }
    return true;
  },
  {
    message: "Informe o valor para o troco",
    path: ["trocoValor"],
  }
);

export type OrderFormData = z.infer<typeof orderSchema>;

interface CreateOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; name: string; phone?: string; role: string } | null;
  profile?: ClientProfileDto;
  isProfileLoading: boolean;
  profileError?: unknown;
  clientSchedule: ClientScheduleEntry[];
}

export function CreateOrderDialog({
  isOpen,
  onOpenChange,
  user,
  profile,
  isProfileLoading,
  profileError,
  clientSchedule,
}: CreateOrderDialogProps) {
  const { toast } = useToast();
  const [profileWarningShown, setProfileWarningShown] = useState(false);
  const [isEntregaCepLoading, setIsEntregaCepLoading] = useState(false);

  useEffect(() => {
    if (profileError) {
      console.error("❌ Erro ao carregar perfil:", profileError);
    }
    if (profile) {
      console.log("✅ Perfil carregado:", profile);
    }
  }, [profile, profileError]);

  useEffect(() => {
    if (isProfileLoading || user?.role !== "client") return;

    if (!profile && !profileWarningShown) {
      toast({
        title: "Não encontramos seu endereço fixo",
        description: "Finalize o cadastro PF/PJ ou fale com a central para atualizar o endereço antes de criar pedidos.",
        variant: "destructive",
      });
      setProfileWarningShown(true);
    }

    if (profile && profileWarningShown) {
      setProfileWarningShown(false);
    }
  }, [isProfileLoading, profile, profileWarningShown, toast, user?.role]);

  const validateBusinessHours = useMemo(() => {
    return (): { valid: boolean; message: string } => {
      if (!clientSchedule || clientSchedule.length === 0) {
        return { valid: true, message: "" };
      }

      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todaySchedules = clientSchedule.filter((s) => s.diaSemana === currentDay);

      if (todaySchedules.length === 0 || todaySchedules[0].fechado) {
        return {
          valid: false,
          message: "Seu estabelecimento está FECHADO hoje. Não é possível criar pedidos em dias de folga.",
        };
      }

      const schedule = todaySchedules[0];
      if (!schedule.horaAbertura || !schedule.horaFechamento) {
        return { valid: false, message: "Horário de funcionamento não cadastrado para hoje." };
      }

      const isWithinBusinessHours = currentTime >= schedule.horaAbertura && currentTime <= schedule.horaFechamento;
      if (!isWithinBusinessHours) {
        return {
          valid: false,
          message: `Seu estabelecimento está FECHADO neste momento. Horário de funcionamento hoje: ${schedule.horaAbertura} às ${schedule.horaFechamento}`,
        };
      }

      return { valid: true, message: "" };
    };
  }, [clientSchedule]);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      coletaRua: "",
      coletaNumero: "",
      coletaBairro: "",
      coletaCep: "29900-000",
      coletaOverride: false,
      coletaComplemento: "",
      referencia: "",
      entregaRua: "",
      entregaNumero: "",
      entregaBairro: "",
      entregaCep: "29900-000",
      entregaComplemento: "",
      observacoes: "",
      produtoNome: "",
      produtoQuantidade: undefined,
      produtoPrecoUnitario: undefined,
      produtoValorTotal: undefined,
      valor: undefined,
      formaPagamento: "dinheiro",
      hasTroco: false,
      trocoValor: undefined,
    },
  });

  const overrideEnabled = form.watch("coletaOverride");
  const isColetaLocked = !overrideEnabled;

  const normalizeCep = (value: string) => value.replace(/\D/g, "").slice(0, 8);

  const handleEntregaCepBlur = async (rawCep: string) => {
    const cep = normalizeCep(rawCep);
    if (cep.length !== 8) return;
    setIsEntregaCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error("CEP não encontrado");
      form.setValue("entregaCep", data.cep || rawCep, { shouldDirty: true });
      form.setValue("entregaRua", data.logradouro || form.getValues("entregaRua"), { shouldDirty: true });
      form.setValue("entregaBairro", data.bairro || form.getValues("entregaBairro"), { shouldDirty: true });
      toast({ title: "Endereço preenchido pelo CEP", description: "Revise número e complemento." });
    } catch (error: any) {
      toast({ title: "CEP inválido", description: error.message || "Não foi possível buscar o CEP.", variant: "destructive" });
    } finally {
      setIsEntregaCepLoading(false);
    }
  };

  useEffect(() => {
    if (!profile || overrideEnabled) return;
    form.setValue("coletaRua", profile.address.rua, { shouldDirty: false });
    form.setValue("coletaNumero", profile.address.numero, { shouldDirty: false });
    form.setValue("coletaBairro", profile.address.bairro, { shouldDirty: false });
    form.setValue("coletaCep", profile.address.cep, { shouldDirty: false });
  }, [profile, overrideEnabled, form]);

  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const res = await apiRequest("POST", "/api/orders", {
        clientId: user?.id,
        clientName: profile?.name ?? user?.name,
        clientPhone: profile?.phone ?? user?.phone ?? "N/A",
        ...data,
        coletaCep: data.coletaCep,
        coletaOverride: data.coletaOverride,
        coletaComplemento: data.coletaComplemento || "",
        referencia: data.referencia || "",
        entregaComplemento: data.entregaComplemento || "",
        observacoes: data.observacoes || "",
        produtoNome: data.produtoNome || null,
        produtoQuantidade: data.produtoQuantidade || null,
        produtoPrecoUnitario: data.produtoPrecoUnitario ? data.produtoPrecoUnitario.toFixed(2) : null,
        produtoValorTotal: data.produtoValorTotal ? data.produtoValorTotal.toFixed(2) : null,
        valor: data.valor.toFixed(2),
        formaPagamento: data.formaPagamento,
        hasTroco: data.hasTroco,
        trocoValor: data.trocoValor ? data.trocoValor.toFixed(2) : null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Pedido criado com sucesso!",
        description: "Seu pedido foi enviado e está aguardando um entregador.",
      });
      onOpenChange(false);
      form.reset({
        coletaRua: profile?.address.rua ?? "",
        coletaNumero: profile?.address.numero ?? "",
        coletaBairro: profile?.address.bairro ?? "",
        coletaCep: profile?.address.cep ?? "29900-000",
        coletaOverride: false,
        coletaComplemento: "",
        referencia: "",
        entregaRua: "",
        entregaNumero: "",
        entregaBairro: "",
        entregaCep: "29900-000",
        entregaComplemento: "",
        observacoes: "",
        produtoNome: "",
        produtoQuantidade: undefined,
        produtoPrecoUnitario: undefined,
        produtoValorTotal: undefined,
        valor: undefined,
        formaPagamento: "dinheiro",
        hasTroco: false,
        trocoValor: undefined,
      });
    },
    onError: (error: any) => {
      console.error("💥 Erro ao criar pedido:", error);
      toast({
        title: "Erro ao criar pedido",
        description: error?.message || "Ocorreu um erro ao processar seu pedido. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const valorOptions = useMemo(() => {
    const hasMensalidade = profile?.mensalidade && profile.mensalidade > 0;
    return hasMensalidade
      ? [
          { value: "7", label: "Padrão - R$ 7,00" },
          { value: "10", label: "Média Distância - R$ 10,00" },
          { value: "15", label: "Longa Distância - R$ 15,00" },
        ]
      : [
          { value: "8", label: "Padrão - R$ 8,00" },
          { value: "10", label: "Média Distância - R$ 10,00" },
          { value: "15", label: "Longa Distância - R$ 15,00" },
        ];
  }, [profile?.mensalidade]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          data-testid="button-new-order"
          disabled={isProfileLoading || !profile}
          title={isProfileLoading ? "Carregando endereço fixo" : !profile ? "Finalize seu cadastro para liberar pedidos" : undefined}
          className="text-xs sm:text-sm md:text-base px-3 sm:px-4"
        >
          <span className="hidden sm:inline">Novo Pedido</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto w-full sm:w-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Criar Novo Pedido</DialogTitle>
        </DialogHeader>

        {isProfileLoading && <p className="text-sm text-muted-foreground">Carregando endereço fixo cadastrado...</p>}

        {!isProfileLoading && !profile && (
          <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">⚠️ Perfil não encontrado</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Você precisa ativar o "Endereço manual" abaixo para criar pedidos sem perfil cadastrado.
            </p>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(
              (data) => {
                if (!profile && !data.coletaOverride) {
                  toast({
                    title: "Perfil não encontrado",
                    description: "Você precisa cadastrar seu endereço no perfil ou ativar o modo manual para criar pedidos.",
                    variant: "destructive",
                  });
                  return;
                }

                const validation = validateBusinessHours();
                if (!validation.valid) {
                  toast({
                    title: "Fora do horário de funcionamento",
                    description: validation.message,
                    variant: "destructive",
                  });
                  return;
                }

                createOrderMutation.mutate(data);
              },
              (errors) => {
                const firstError = Object.values(errors)[0];
                if (firstError) {
                  toast({
                    title: "Erro de validação",
                    description: (firstError as any).message || "Verifique os campos obrigatórios",
                    variant: "destructive",
                  });
                }
              }
            )}
            className="space-y-3 sm:space-y-4"
          >
            <FormField
              control={form.control}
              name="coletaOverride"
              render={({ field }) => (
                <FormItem className="space-y-2 rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <FormLabel className="text-base">Endereço de coleta automatizado</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {profile
                          ? `${profile.address.rua}, ${profile.address.numero} - ${profile.address.bairro}`
                          : "Carregando endereço fixo cadastrado..."}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Desative apenas em emergências para informar um endereço diferente neste pedido.
                      </p>
                    </div>
                    <FormControl>
                      <UiSwitch
                        checked={field.value}
                        onCheckedChange={(checked: boolean) => {
                          field.onChange(checked);
                          if (!checked && profile) {
                            form.setValue("coletaRua", profile.address.rua, { shouldDirty: false });
                            form.setValue("coletaNumero", profile.address.numero, { shouldDirty: false });
                            form.setValue("coletaBairro", profile.address.bairro, { shouldDirty: false });
                            form.setValue("coletaCep", profile.address.cep, { shouldDirty: false });
                          }
                        }}
                        disabled={isProfileLoading || !profile}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <h3 className="font-semibold">Coleta</h3>
              <FormField control={form.control} name="coletaCep" render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="00000-000"
                      data-testid="input-coleta-cep"
                      readOnly={isColetaLocked}
                      aria-readonly={isColetaLocked}
                      className={isColetaLocked ? "bg-muted" : undefined}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="coletaRua" render={({ field }) => (
                <FormItem>
                  <FormLabel>Rua</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Rua da Coleta"
                      data-testid="input-coleta-rua"
                      readOnly={isColetaLocked}
                      aria-readonly={isColetaLocked}
                      className={isColetaLocked ? "bg-muted" : undefined}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="coletaNumero" render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="123"
                      data-testid="input-coleta-numero"
                      readOnly={isColetaLocked}
                      aria-readonly={isColetaLocked}
                      className={isColetaLocked ? "bg-muted" : undefined}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="coletaBairro" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Centro"
                      data-testid="input-coleta-bairro"
                      readOnly={isColetaLocked}
                      aria-readonly={isColetaLocked}
                      className={isColetaLocked ? "bg-muted" : undefined}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="coletaComplemento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: Apto 302, Sala 10"
                      data-testid="input-coleta-complemento"
                      readOnly={isColetaLocked}
                      aria-readonly={isColetaLocked}
                      className={isColetaLocked ? "bg-muted" : undefined}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="referencia" render={({ field }) => (
                <FormItem>
                  <FormLabel>Referência (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: Próximo ao banco, Em frente à padaria"
                      data-testid="input-referencia"
                      readOnly={isColetaLocked}
                      aria-readonly={isColetaLocked}
                      className={isColetaLocked ? "bg-muted" : undefined}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Entrega</h3>
              <FormField control={form.control} name="entregaCep" render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="00000-000"
                      data-testid="input-entrega-cep"
                      onBlur={(e) => {
                        field.onBlur();
                        handleEntregaCepBlur(e.target.value);
                      }}
                      disabled={isEntregaCepLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="entregaRua" render={({ field }) => (
                <FormItem>
                  <FormLabel>Rua</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Rua da Entrega" data-testid="input-entrega-rua" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="entregaNumero" render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="456" data-testid="input-entrega-numero" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="entregaBairro" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Praia" data-testid="input-entrega-bairro" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="entregaComplemento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento (Opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Apto 101, Casa 2" data-testid="input-entrega-complemento" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem>
                <FormLabel>O que você está enviando? (Descrição do Produto)</FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    placeholder="Ex: 1 pizza grande, Documentos, Encomenda, Roupas, etc."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid="textarea-observacoes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-4 rounded-lg border-2 border-amber-500/20 p-4 bg-amber-50/50 dark:bg-amber-950/20">
              <h3 className="font-semibold text-lg">📦 Produto e Valores</h3>

              <FormField control={form.control} name="produtoNome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto/Item (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: Pizza Margherita, Bolo de Chocolate, Notebook"
                      data-testid="input-produto-nome"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="produtoQuantidade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1"
                        onChange={(e) => {
                          const qtd = parseInt(e.target.value) || 0;
                          field.onChange(qtd);
                          const preco = form.getValues("produtoPrecoUnitario");
                          if (preco && qtd > 0) {
                            form.setValue("produtoValorTotal", qtd * preco);
                          }
                        }}
                        value={field.value || ""}
                        data-testid="input-produto-quantidade"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="produtoPrecoUnitario" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Unitário (R$)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        onChange={(e) => {
                          const preco = parseFloat(e.target.value) || 0;
                          field.onChange(preco);
                          const qtd = form.getValues("produtoQuantidade");
                          if (qtd && preco > 0) {
                            form.setValue("produtoValorTotal", qtd * preco);
                          }
                        }}
                        value={field.value || ""}
                        data-testid="input-produto-preco-unitario"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="produtoValorTotal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Total dos Produtos</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      value={field.value || ""}
                      data-testid="input-produto-valor-total"
                      className="font-semibold text-lg"
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">💡 Este é o valor que o motoboy vai cobrar do destinatário</p>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="space-y-4 rounded-lg border-2 border-primary/20 p-4 bg-primary/5">
              <h3 className="font-semibold text-lg">💰 Frete e Forma de Pagamento</h3>

              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da Entrega (Frete)</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseFloat(val))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-valor-entrega">
                          <SelectValue placeholder="Selecione o valor do frete" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {valorOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">💡 Taxa do motoboy calculada automaticamente</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="formaPagamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-forma-pagamento">
                        <SelectValue placeholder="Como vai pagar?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                      <SelectItem value="cartao">💳 Cartão</SelectItem>
                      <SelectItem value="pix">📱 Pix</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {form.watch("formaPagamento") === "dinheiro" && (
                <div className="space-y-3 p-3 bg-background rounded-md border">
                  <FormField control={form.control} name="hasTroco" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-has-troco" />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Precisa de troco?</FormLabel>
                      </div>
                    </FormItem>
                  )} />

                  {form.watch("hasTroco") && (
                    <FormField control={form.control} name="trocoValor" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Troco para quanto? (R$)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="50.00"
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            value={field.value || ""}
                            data-testid="input-troco-valor"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createOrderMutation.isPending || isProfileLoading}
              data-testid="button-submit-order"
            >
              {createOrderMutation.isPending ? "Criando Pedido..." : "Criar Pedido"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
