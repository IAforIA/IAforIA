import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TruckIcon, Users, Package, BarChart3, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import heroImage from "@assets/generated_images/Hero_logistics_delivery_truck_2a783042.png";
import ThemeToggle from "@/components/ThemeToggle";

export default function Landing() {
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild data-testid="button-login">
              <Link href="/central">Entrar</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-6" data-testid="text-hero-title">
            Conectando Empresas e Entregadores
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
            A plataforma B2B completa para gerenciar suas entregas com eficiência e transparência
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" asChild data-testid="button-get-started">
              <Link href="/client">
                Começar Agora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-background/20 backdrop-blur-sm border-white/30 text-white hover:bg-background/30"
              data-testid="button-learn-more"
            >
              Saiba Mais
            </Button>
          </div>
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
                  Monitore o status de todas as entregas instantaneamente
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
                <h3 className="font-semibold mb-1">Relatórios Detalhados</h3>
                <p className="text-sm text-muted-foreground">
                  Análises e métricas para otimizar suas operações
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Guriri Express. Plataforma B2B de Entregas.
          </p>
        </div>
      </footer>
    </div>
  );
}
