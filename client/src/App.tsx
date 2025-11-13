import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { TruckIcon } from "lucide-react";

function SimpleLanding() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto">
          <TruckIcon className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">Guriri Express</h1>
        <p className="text-xl text-muted-foreground">
          Plataforma B2B de Entregas - Conectando Empresas e Entregadores
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button size="lg" onClick={() => window.location.href = '/central'}>
            Portal Central
          </Button>
          <Button size="lg" variant="outline" onClick={() => window.location.href = '/client'}>
            Portal Cliente
          </Button>
          <Button size="lg" variant="secondary" onClick={() => window.location.href = '/driver'}>
            Portal Entregador
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-8">
          ✓ Sistema está funcionando corretamente
        </p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={SimpleLanding} />
      <Route path="/central">
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-4">Dashboard Central</h1>
          <p className="text-muted-foreground mb-4">Sistema administrativo para gerenciar pedidos, clientes e entregadores.</p>
          <Button onClick={() => window.location.href = '/'}>Voltar</Button>
        </div>
      </Route>
      <Route path="/client">
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-4">Portal do Cliente B2B</h1>
          <p className="text-muted-foreground mb-4">Crie e acompanhe seus pedidos de entrega.</p>
          <Button onClick={() => window.location.href = '/'}>Voltar</Button>
        </div>
      </Route>
      <Route path="/driver">
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-4">Portal do Entregador</h1>
          <p className="text-muted-foreground mb-4">Aceite entregas e gerencie suas rotas.</p>
          <Button onClick={() => window.location.href = '/'}>Voltar</Button>
        </div>
      </Route>
      <Route>
        <div className="p-8">
          <h1 className="text-2xl font-bold">Página não encontrada</h1>
          <Button onClick={() => window.location.href = '/'} className="mt-4">Voltar ao Início</Button>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
