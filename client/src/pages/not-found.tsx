import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Importar Button
import { AlertCircle, Home } from "lucide-react"; // Importar Home icon
import { useLocation } from "wouter"; // Importar useLocation (ou useNavigate se estiver usando React Router)

export default function NotFound() {
  const [, setLocation] = useLocation(); // Hook para navegação

  return (
    // Usar classes consistentes com o tema global
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 items-center gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" /> {/* Usar classe de cor do tema */}
            <h1 className="text-2xl font-bold text-foreground">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            A página que você procura não existe. Verifique o URL ou retorne à página inicial.
          </p>

          {/* Adicionar um botão de retorno */}
          <div className="mt-6">
            <Button onClick={() => setLocation('/')} className="w-full" data-testid="button-go-home">
              <Home className="mr-2 h-4 w-4" />
              Ir para a Página Inicial
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
