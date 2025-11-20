import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TruckIcon, Users, Package, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { clientOnboardingSchema } from "@shared/contracts";

const onboardingExtraSchema = z.object({
  confirmPassword: z.string().min(8, "Confirme sua senha"),
});

const onboardingFormSchema = z
  .intersection(clientOnboardingSchema, onboardingExtraSchema)
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas precisam ser iguais",
    path: ["confirmPassword"],
  });

type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

const onboardingDefaultValues: OnboardingFormValues = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  documentType: "PF",
  documentNumber: "",
  ie: "",
  address: {
    cep: "",
    rua: "",
    numero: "",
    bairro: "",
    complemento: "",
    referencia: "",
  },
  acceptFixedAddress: false,
};

export default function Landing() {
  const [, setLocation] = useLocation();
  const { user, login } = useAuth();
  // CORREÇÃO: Renomeado de 'userId' para 'email'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);

  const registerForm = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: onboardingDefaultValues,
  });

  const watchDocumentType = registerForm.watch("documentType");

  const registerMutation = useMutation({
    mutationFn: async (values: OnboardingFormValues) => {
      const { confirmPassword, ...rest } = values;
      const sanitizedPayload = {
        ...rest,
        documentNumber: rest.documentNumber.replace(/\D/g, ""),
        ie: rest.documentType === "PJ" ? rest.ie : undefined,
        address: {
          ...rest.address,
          cep: rest.address.cep.replace(/\D/g, ""),
        },
      };
      const response = await apiRequest("POST", "/api/auth/register", sanitizedPayload);
      return response.json();
    },
    onSuccess: async (_data, variables) => {
      await login(variables.email, variables.password);
      toast({
        title: "Cadastro concluído",
        description: "Bem-vindo(a)! Redirecionando...",
      });
      registerForm.reset(onboardingDefaultValues);
      setRegisterModalOpen(false);
      setActiveTab("login");
    },
    onError: (error) => {
      toast({
        title: "Não foi possível concluir o cadastro",
        description: error instanceof Error ? error.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    },
  });

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value);
  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value);
  const handleTabChange = (value: string) => {
    setActiveTab(value as "login" | "register");
    if (value === "register") {
      setRegisterModalOpen(true);
    }
  };

  const handleRegisterModalChange = (open: boolean) => {
    setRegisterModalOpen(open);
    if (!open) {
      setActiveTab("login");
    }
  };

  useEffect(() => {
    if (user) {
      if (user.role === 'central') setLocation('/central');
      else if (user.role === 'client') setLocation('/client');
      else if (user.role === 'motoboy') setLocation('/driver');
    }
  }, [user, setLocation]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // CORREÇÃO: Passando 'email' para a função login
      const success = await login(email, password);
      if (success) {
        toast({
          title: "Login bem-sucedido!",
          description: "Redirecionando...",
        });
      } else {
        toast({
          title: "Erro ao fazer login",
          // CORREÇÃO: Mensagem mais clara
          description: "Email ou senha incorretos",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao fazer login",
        description: "Ocorreu um erro de conexão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <TruckIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Guriri Express</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <section className="relative min-h-[700px] md:min-h-[760px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-blue-600 to-blue-800 pb-16 md:pb-24">
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-black/30" />

        <div className="relative z-10 container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <h1 className="text-5xl md:text-6xl font-bold mb-6" data-testid="text-hero-title">
              Conectando Empresas e Entregadores
            </h1>
            <p className="text-xl text-white/90 mb-6">
              A plataforma B2B completa para gerenciar suas entregas com eficiência e transparência
            </p>
          </div>

          <Card className="max-w-md w-full mx-auto relative z-20 shadow-2xl">
            <CardHeader>
              <CardTitle>Acesse ou Cadastre</CardTitle>
              <CardDescription>
                Login imediato para equipes existentes ou onboarding PF/PJ com endereço fixo aprovado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="register">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="central@email.com"
                        value={email}
                        onChange={handleEmailChange}
                        required
                        data-testid="input-user-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Sua senha"
                        value={password}
                        onChange={handlePasswordChange}
                        required
                        data-testid="input-password"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
                      {isLoading ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      O formulário completo abre em uma janela dedicada para manter o layout da landing intacto
                      enquanto você fornece todos os dados necessários.
                    </p>
                    <Button variant="outline" className="w-full" onClick={() => setRegisterModalOpen(true)}>
                      Abrir formulário de cadastro
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>

      <Dialog open={isRegisterModalOpen} onOpenChange={handleRegisterModalChange}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastro Guriri Express</DialogTitle>
            <DialogDescription>
              Preencha os dados da sua operação para liberar o acesso completo à plataforma.
            </DialogDescription>
          </DialogHeader>
          {/*
            O formulário é extenso, então limitamos a altura e habilitamos rolagem independente
            para que o usuário complete o onboarding sem deformar o layout principal.
          */}
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <Form {...registerForm}>
              <form
                onSubmit={registerForm.handleSubmit((values) => registerMutation.mutate(values))}
                className="space-y-4 text-left pb-2"
              >
                <div className="grid gap-3">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razão social ou nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Restaurante Atlântico" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email corporativo</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="empresa@cliente.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone / WhatsApp</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="(27) 99999-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={registerForm.control}
                    name="documentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de documento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PF">Pessoa Física (CPF)</SelectItem>
                            <SelectItem value="PJ">Pessoa Jurídica (CNPJ)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="documentNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{watchDocumentType === 'PJ' ? 'CNPJ' : 'CPF'}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={watchDocumentType === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {watchDocumentType === 'PJ' && (
                  <FormField
                    control={registerForm.control}
                    name="ie"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição Estadual (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="ISENTO / 123456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="space-y-3">
                  <p className="text-sm font-semibold">Endereço fixo para coleta</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField
                      control={registerForm.control}
                      name="address.cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input inputMode="numeric" placeholder="29900-000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="address.numero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input placeholder="123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={registerForm.control}
                    name="address.rua"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rua / Avenida</FormLabel>
                        <FormControl>
                          <Input placeholder="Av. Guriri" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="address.bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input placeholder="Centro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField
                      control={registerForm.control}
                      name="address.complemento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input placeholder="Sala 2 / Galpão" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="address.referencia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Referência</FormLabel>
                          <FormControl>
                            <Input placeholder="Ao lado da praça" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirme a senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Repita a senha" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={registerForm.control}
                  name="acceptFixedAddress"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 rounded-md border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      </FormControl>
                      <div className="space-y-1 text-sm">
                        <FormLabel>
                          Autorizo reutilizar este endereço em todos os pedidos para evitar erros operacionais.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? "Cadastrando..." : "Cadastrar e acessar"}
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ... (Resto da sua Landing Page) ... */}
       <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Como Funciona</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Uma solução completa para gerenciar todo o processo de entrega
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 text-center hover-elevate">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Central Administrativa</h3>
              <p className="text-muted-foreground">
                Gerencie clientes, entregadores e pedidos em uma única plataforma
              </p>
            </Card>

            <Card className="p-6 text-center hover-elevate">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Portal do Cliente B2B</h3>
              <p className="text-muted-foreground">
                Crie pedidos, acompanhe entregas e acesse histórico completo
              </p>
            </Card>

            <Card className="p-6 text-center hover-elevate">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <TruckIcon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">App do Entregador</h3>
              <p className="text-muted-foreground">
                Aceite entregas, atualize status e gerencie suas rotas
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Recursos Principais</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Acompanhamento em Tempo Real</h3>
                <p className="text-sm text-muted-foreground">
                  Monitore o status e a localização exata de cada entrega do início ao fim.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Gestão de Entregadores</h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie perfis de motoboys, status de disponibilidade e performance.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Otimização de Rotas (AI Engine)</h3>
                <p className="text-sm text-muted-foreground">
                  Algoritmo inteligente para atribuir o entregador mais próximo e otimizar rotas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          &copy; 2024 Guriri Express. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}