import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect, createContext, useContext } from "react";
import Landing from "@/pages/landing";
import CentralDashboard from "@/pages/central-dashboard";
import ClientDashboard from "@/pages/client-dashboard";
import DriverDashboard from "@/pages/driver-dashboard";
import TestSimple from "@/pages/test-simple";
import NotFound from "@/pages/not-found";

type AuthUser = { id: string; name: string; role: string; phone?: string };

type AuthContextType = {
  user: AuthUser | null;
  token: string | null; // CORRIGIDO: Adicionado o token ao contexto
  login: (id: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => false,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

// CORRIGIDO: ProtectedRoute agora gerencia o acesso com base no user e token do contexto
function ProtectedRoute({ component: Component, role }: { component: React.ComponentType; role?: string }) {
  const { user, token } = useAuth();

  // Se não houver usuário ou token, redireciona para login
  if (!user || !token) {
    return <Redirect to="/" />;
  }

  // Se a role não for compatível, redireciona para login
  if (role && user.role !== role) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/test" component={TestSimple} />

      {/* Rotas principais e todas as subrotas dos dashboards */}
      <Route path="/central/:rest*">
        <ProtectedRoute component={CentralDashboard} role="central" />
      </Route>
      <Route path="/client/:rest*">
        <ProtectedRoute component={ClientDashboard} role="client" />
      </Route>
      <Route path="/driver/:rest*">
        <ProtectedRoute component={DriverDashboard} role="motoboy" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

// Safe localStorage wrapper para browsers que bloqueiam storage
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // Silently fail if localStorage is blocked
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Silently fail if localStorage is blocked
    }
  }
};

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null); // Adicionado estado para o token

  useEffect(() => {
    const storedUser = safeStorage.getItem('guriri_user');
    const storedToken = safeStorage.getItem('guriri_token'); // Recupera o token
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (e) {
        // Invalid JSON/token, clear storage
        safeStorage.removeItem('guriri_user');
        safeStorage.removeItem('guriri_token');
      }
    }
  }, []);

  const login = async (id: string, password: string): Promise<boolean> => {
    try {
      // Nota: Para segurança máxima, esta requisição deveria retornar HttpOnly cookies,
      // tornando o armazenamento manual no localStorage obsoleto.
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const userData = { id: data.id, name: data.name, role: data.role };

      setUser(userData);
      setToken(data.access_token); // Define o token no estado
      safeStorage.setItem('guriri_user', JSON.stringify(userData));
      safeStorage.setItem('guriri_token', data.access_token); // Armazena o token (vulnerável a XSS)

      return true;
    } catch (error) {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null); // Limpa o token do estado
    safeStorage.removeItem('guriri_user');
    safeStorage.removeItem('guriri_token');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Fornece user E token ao contexto */}
        <AuthContext.Provider value={{ user, token, login, logout }}>
          <Router />
          <Toaster />
        </AuthContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
