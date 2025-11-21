import { createContext, useContext } from "react";

export type AuthUser = { 
  id: string; 
  name: string; 
  role: 'client' | 'motoboy' | 'central'; 
  phone?: string 
};

export type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => false,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);
