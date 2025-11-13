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

type AuthContextType = {
  user: { id: string; name: string; role: string } | null;
  login: (id: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

function ProtectedRoute({ component: Component, role }: { component: React.ComponentType; role?: string }) {
  const { user } = useAuth();
  
  if (!user) {
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
      <Route path="/central" component={CentralDashboard} />
      <Route path="/client" component={ClientDashboard} />
      <Route path="/driver" component={DriverDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Safe localStorage wrapper for browsers that block storage
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
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);

  useEffect(() => {
    const storedUser = safeStorage.getItem('guriri_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
  }, []);

  const login = async (id: string, password: string): Promise<boolean> => {
    try {
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
      safeStorage.setItem('guriri_user', JSON.stringify(userData));
      safeStorage.setItem('guriri_token', data.access_token);
      return true;
    } catch (error) {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    safeStorage.removeItem('guriri_user');
    safeStorage.removeItem('guriri_token');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthContext.Provider value={{ user, login, logout }}>
          <Router />
          <Toaster />
        </AuthContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
