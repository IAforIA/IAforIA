/**
 * ARQUIVO: client/src/App.tsx
 * PROPÓSITO: Componente raiz da aplicação React
 * 
 * RESPONSABILIDADES:
 * - Configurar providers globais (React Query, Auth, Tooltips)
 * - Gerenciar estado de autenticação (user, token)
 * - Definir rotas e proteção por role (RBAC)
 * - Persistir sessão no localStorage
 * 
 * ARQUITETURA:
 * - AuthContext: Provê user/token para toda aplicação
 * - Router (Wouter): Roteamento client-side
 * - ProtectedRoute: HOC que valida autenticação
 */

// Switch, Route, Redirect: Componentes de roteamento (Wouter - alternativa leve ao React Router)
import { Switch, Route, Redirect } from "wouter";
// queryClient: Instância configurada do React Query
import { queryClient } from "./lib/queryClient";
// QueryClientProvider: Provider que disponibiliza React Query para toda árvore
import { QueryClientProvider } from "@tanstack/react-query";
// Toaster: Componente de notificações toast (shadcn/ui)
import { Toaster } from "@/components/ui/toaster";
// TooltipProvider: Provider para tooltips funcionarem (shadcn/ui)
import { TooltipProvider } from "@/components/ui/tooltip";
// useState, useEffect: Hooks do React para estado e efeitos colaterais
import { useState, useEffect, Suspense, lazy } from "react";

// PÁGINAS: Componentes de cada rota
const Landing = lazy(() => import("@/pages/landing"));
const CentralDashboard = lazy(() => import("@/pages/central-dashboard"));
const ClientDashboard = lazy(() => import("@/pages/client-dashboard"));
const DriverDashboard = lazy(() => import("@/pages/driver-dashboard"));
const TestSimple = lazy(() => import("@/pages/test-simple"));
const NotFound = lazy(() => import("@/pages/not-found"));

// AUTENTICAÇÃO: Context e hook personalizado
import { AuthContext, useAuth, type AuthUser } from "@/hooks/use-auth";

// ========================================
// COMPONENTE: ROTA PROTEGIDA
// ========================================

/**
 * COMPONENTE: ProtectedRoute
 * PROPÓSITO: HOC (Higher-Order Component) que valida autenticação antes de renderizar
 * PROPS:
 *   - component: Componente a ser renderizado se autorizado
 *   - role: Role opcional requerido ('central' | 'client' | 'motoboy')
 * 
 * LÓGICA:
 * 1. Verifica se user e token existem
 * 2. Se não autenticado: redireciona para landing page
 * 3. Se role especificado e user.role não corresponde: redireciona
 * 4. Se tudo ok: renderiza componente
 * 
 * USO:
 *   <ProtectedRoute component={CentralDashboard} role="central" />
 */
function ProtectedRoute({ component: Component, role }: { component: React.ComponentType; role?: string }) {
  // HOOK: Acessa contexto de autenticação
  const { user, token } = useAuth();

  // VALIDAÇÃO: Usuário não autenticado
  if (!user || !token) {
    return <Redirect to="/" />;
  }

  // VALIDAÇÃO: Role não autorizado (RBAC - Role-Based Access Control)
  if (role && user.role !== role) {
    return <Redirect to="/" />;
  }

  // RENDERIZAÇÃO: Usuário autorizado
  return <Component />;
}

// ========================================
// COMPONENTE: ROTEADOR
// ========================================

/**
 * COMPONENTE: Router
 * PROPÓSITO: Define todas as rotas da aplicação
 * 
 * ROTAS PÚBLICAS:
 *   - / : Landing page (login)
 *   - /test : Página de teste (desenvolvimento)
 * 
 * ROTAS PROTEGIDAS:
 *   - /central/* : Dashboard central (role: central)
 *   - /client/* : Dashboard cliente (role: client)
 *   - /driver/* : Dashboard motoboy (role: motoboy)
 * 
 * NOTA: Padrão /:rest* captura subrotas (ex: /central/orders)
 */
function Router() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Carregando...</div>}>
      <Switch>
        {/* ROTAS PÚBLICAS */}
        <Route path="/" component={Landing} />
        <Route path="/test" component={TestSimple} />

        {/* ROTAS PROTEGIDAS: CENTRAL */}
        {/* Rota base */}
        <Route path="/central">
          <ProtectedRoute component={CentralDashboard} role="central" />
        </Route>
        {/* Subrotas (ex: /central/orders, /central/drivers) */}
        <Route path="/central/:rest*">
          <ProtectedRoute component={CentralDashboard} role="central" />
        </Route>

        {/* ROTAS PROTEGIDAS: CLIENTE */}
        <Route path="/client">
          <ProtectedRoute component={ClientDashboard} role="client" />
        </Route>
        <Route path="/client/:rest*">
          <ProtectedRoute component={ClientDashboard} role="client" />
        </Route>

        {/* ROTAS PROTEGIDAS: MOTOBOY */}
        <Route path="/driver">
          <ProtectedRoute component={DriverDashboard} role="motoboy" />
        </Route>
        <Route path="/driver/:rest*">
          <ProtectedRoute component={DriverDashboard} role="motoboy" />
        </Route>

        {/* ROTA FALLBACK: 404 Not Found */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// ========================================
// UTILITÁRIO: SAFE LOCALSTORAGE
// ========================================

/**
 * OBJETO: safeStorage
 * PROPÓSITO: Wrapper para localStorage que não lança erros
 * 
 * PROBLEMA: localStorage pode:
 * - Não existir (modo privado, SSR)
 * - Estar bloqueado por política de segurança
 * - Estar cheio (quota exceeded)
 * 
 * SOLUÇÃO: Try/catch em todas as operações
 * COMPORTAMENTO: Falha silenciosamente (graceful degradation)
 */
const safeStorage = {
  /**
   * MÉTODO: getItem
   * RETORNO: string | null (null se erro)
   */
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  
  /**
   * MÉTODO: setItem
   * COMPORTAMENTO: Falha silenciosamente em caso de erro
   */
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // Silently fail if localStorage is blocked
    }
  },
  
  /**
   * MÉTODO: removeItem
   * COMPORTAMENTO: Falha silenciosamente em caso de erro
   */
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Silently fail if localStorage is blocked
    }
  }
};

// ========================================
// COMPONENTE PRINCIPAL: APP
// ========================================

/**
 * COMPONENTE EXPORTADO: App
 * PROPÓSITO: Componente raiz que configura toda a aplicação
 * 
 * RESPONSABILIDADES:
 * - Gerenciar estado global de autenticação
 * - Persistir/restaurar sessão do localStorage
 * - Prover contextos globais (React Query, Auth, Tooltips)
 * - Renderizar roteador principal
 * 
 * ESTADOS:
 * - user: Dados do usuário autenticado | null
 * - token: JWT token | null
 * - isLoading: Flag de carregamento inicial
 * 
 * EFEITOS:
 * - useEffect: Restaura sessão do localStorage na montagem
 */
export default function App() {
  // ESTADO: Usuário autenticado (null = não logado)
  const [user, setUser] = useState<AuthUser | null>(null);
  
  // ESTADO: Token JWT (null = não logado)
  const [token, setToken] = useState<string | null>(null);
  
  // ESTADO: Loading inicial (true até verificar localStorage)
  const [isLoading, setIsLoading] = useState(true);

  // ========================================
  // EFEITO: RESTAURAR SESSÃO
  // ========================================
  
  /**
   * EFEITO: Executa uma vez na montagem do componente
   * PROPÓSITO: Restaurar sessão salva no localStorage
   * 
   * FLUXO:
   * 1. Lê 'guriri_user' e 'guriri_token' do localStorage
   * 2. Se existem: parseia JSON e atualiza estados
   * 3. Se erro: limpa estados (JSON inválido)
   * 4. Define isLoading = false
   */
  useEffect(() => {
    try {
      // RECUPERAÇÃO: Busca dados salvos
      const storedUser = safeStorage.getItem('guriri_user');
      const storedToken = safeStorage.getItem('guriri_token');
      
      // VALIDAÇÃO: Ambos devem existir
      if (storedUser && storedToken) {
        try {
          // DESERIALIZAÇÃO: Converte JSON para objeto
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        } catch (e) {
          // LOG: Erro ao parsear JSON (localStorage corrompido)
          console.error('Error parsing stored user:', e);
          
          // LIMPEZA: Remove dados corrompidos
          safeStorage.removeItem('guriri_user');
          safeStorage.removeItem('guriri_token');
        }
      }
    } catch (error) {
      // LOG: Erro geral ao carregar estado
      console.error('Error loading auth state:', error);
    } finally {
      // FINALIZAÇÃO: Sempre marca como carregado (mesmo se erro)
      setIsLoading(false);
    }
  }, []); // DEPENDÊNCIAS: Array vazio = executa uma vez na montagem

  // ========================================
  // FUNÇÃO: LOGIN
  // ========================================
  
  /**
   * FUNÇÃO: login
   * PROPÓSITO: Autentica usuário via API
   * PARÂMETROS:
   *   - email: Email do usuário
   *   - password: Senha em texto plano (hasheada no backend)
   * RETORNO: Promise<boolean> (true = sucesso, false = falha)
   * 
   * FLUXO:
   * 1. POST /api/auth/login com credentials
   * 2. Se sucesso: armazena user/token no estado e localStorage
   * 3. Se falha: retorna false sem modificar estado
   * 
   * USADO EM: Landing.tsx (componente de login)
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // REQUISIÇÃO: POST para endpoint de login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // PAYLOAD: Email e senha (backend valida com bcrypt)
        body: JSON.stringify({ email, password }),
      });

      // VALIDAÇÃO: Verifica status HTTP
      if (!response.ok) {
        // ERRO: Tenta extrair mensagem de erro do JSON
        const errorData = await response.json().catch(() => ({}));
        console.error('Login failed:', errorData);
        return false;
      }

      // DESERIALIZAÇÃO: Extrai dados do usuário e token
      const data = await response.json();
      
      // CONSTRUÇÃO: Objeto AuthUser
      const userData: AuthUser = { 
        id: data.id,        // UUID do usuário
        name: data.name,    // Nome para exibição
        role: data.role,    // Role para RBAC
        phone: data.phone,  // Telefone opcional
        email: data.email,  // Email para exibição em configurações
      };

      // ATUALIZAÇÃO: Estados do React
      setUser(userData);
      setToken(data.access_token);
      
      // PERSISTÊNCIA: Salva no localStorage para sobreviver reload
      safeStorage.setItem('guriri_user', JSON.stringify(userData));
      safeStorage.setItem('guriri_token', data.access_token);

      return true; // Sucesso
      
    } catch (error) {
      // LOG: Erro de rede ou exception
      console.error('Login error:', error);
      return false;
    }
  };

  // ========================================
  // FUNÇÃO: LOGOUT
  // ========================================
  
  /**
   * FUNÇÃO: logout
   * PROPÓSITO: Desconecta usuário e limpa sessão
   * 
   * AÇÕES:
   * 1. Limpa estados React (user, token)
   * 2. Remove dados do localStorage
   * 3. Usuário redirecionado para / (via ProtectedRoute)
   * 
   * USADO EM: Botão de logout em todos os dashboards
   */
  const logout = () => {
    // LIMPEZA: Estados React
    setUser(null);
    setToken(null);
    
    // LIMPEZA: localStorage
    safeStorage.removeItem('guriri_user');
    safeStorage.removeItem('guriri_token');
  };

  // ========================================
  // RENDERIZAÇÃO CONDICIONAL: LOADING
  // ========================================
  
  /**
   * LOADING STATE: Exibido enquanto verifica localStorage
   * PROPÓSITO: Evitar flash de conteúdo não autenticado
   * DURAÇÃO: Alguns milissegundos (apenas leitura de localStorage)
   */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-2xl">
        Carregando...
      </div>
    );
  }

  // ========================================
  // RENDERIZAÇÃO PRINCIPAL
  // ========================================
  
  /**
   * ESTRUTURA DE PROVIDERS:
   * 
   * QueryClientProvider: Provê React Query para toda aplicação
   *   └─ TooltipProvider: Habilita tooltips shadcn/ui
   *       └─ AuthContext.Provider: Provê autenticação
   *           ├─ Router: Rotas da aplicação
   *           └─ Toaster: Notificações toast
   * 
   * ORDEM IMPORTANTE:
   * 1. QueryClient mais externo (usado por todas as queries)
   * 2. TooltipProvider para UI components
   * 3. AuthContext para autenticação em todas as rotas
   * 4. Router e Toaster como filhos (consomem providers acima)
   */
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