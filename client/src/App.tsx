import { Button } from "@/components/ui/button";
import { TruckIcon } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto">
          <TruckIcon className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">Guriri Express</h1>
        <p className="text-xl text-muted-foreground">
          Plataforma B2B de Entregas
        </p>
        <p className="text-lg text-foreground">
          Conectando Empresas e Entregadores
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button size="lg">Portal Central</Button>
          <Button size="lg" variant="outline">Portal Cliente</Button>
          <Button size="lg" variant="secondary">Portal Entregador</Button>
        </div>
        <div className="mt-8 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            ✓ Sistema funcionando corretamente
          </p>
        </div>
      </div>
    </div>
  );
}
