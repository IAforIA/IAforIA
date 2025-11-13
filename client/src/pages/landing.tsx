import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TruckIcon, Users, Package, BarChart3, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/App";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { user, login } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      if (user.role === 'central') setLocation('/central');
      else if (user.role === 'client') setLocation('/client');
      else if (user.role === 'motoboy') setLocation('/driver');
    }
  }, [user, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(userId, password);
      if (success) {
        toast({
          title: "Login bem-sucedido!",
          description: "Redirecionando...",
        });
      } else {
        toast({
          title: "Erro ao fazer login",
          description: "ID ou senha incorretos",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao fazer login",
        description: "Tente novamente",
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

      <section className="relative h-[600px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-blue-600 to-blue-800">
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

          <Card className="max-w-md w-full mx-auto">
            <CardHeader>
              <CardTitle>Acessar Plataforma</CardTitle>
              <CardDescription>Entre com seu ID e senha</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">ID do Usuário</Label>
                  <Input
                    id="userId"
                    placeholder="central_01, cliente_01 ou motoboy_01"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                    data-testid="input-user-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Contas de Teste:</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>• Central: <code className="text-foreground">central_01</code></p>
                  <p>• Cliente: <code className="text-foreground">cliente_01</code></p>
                  <p>• Motoboy: <code className="text-foreground">motoboy_01</code></p>
                  <p className="mt-2">Senha para todos: <code className="text-foreground">123456</code></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

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
                  Monitore o status de todas as entregas instantaneamente via WebSocket
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Gestão de Pedidos</h3>
                <p className="text-sm text-muted-foreground">
                  Sistema completo para criação e gerenciamento de pedidos
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Múltiplos Perfis</h3>
                <p className="text-sm text-muted-foreground">
                  Interfaces dedicadas para central, clientes e entregadores
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">IA Local para Otimização</h3>
                <p className="text-sm text-muted-foreground">
                  Atribuição automática de pedidos e otimização de rotas
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Guriri Express. Plataforma B2B de Entregas com IA Local.
          </p>
        </div>
      </footer>
    </div>
  );
}
