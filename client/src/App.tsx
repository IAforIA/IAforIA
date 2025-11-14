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
  token: string | null;
  // CORREÇÃO: A função 'login' agora espera 'email'
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => false,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

function ProtectedRoute({ component: Component, role }: { component: React.ComponentType; role?: string }) {
  const { user, token } = useAuth();

  if (!user || !token) {
    return <Redirect to="/" />;
  }

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

      {/* Dashboards com suporte a subrotas */}
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
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = safeStorage.getItem('guriri_user');
    const storedToken = safeStorage.getItem('guriri_token');
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (e) {
        safeStorage.removeItem('guriri_user');
        safeStorage.removeItem('guriri_token');
      }
    }
  }, []);

  // CORREÇÃO: A função 'login' agora usa 'email'
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // CORREÇÃO: Envia 'email' no body, não 'id'
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const userData = { id: data.id, name: data.name, role: data.role };

      setUser(userData);
      setToken(data.access_token);
      safeStorage.setItem('guriri_user', JSON.stringify(userData));
      safeStorage.setItem('guriri_token', data.access_token);

      return true;
    } catch (error) {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    safeStorage.removeItem('guriri_user');
    safeStorage.removeItem('guriri_token');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthContext.Provider value={{ user, token, login, logout }}>
          <Router />
          <Toaster />
        </AuthContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}