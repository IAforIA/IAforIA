/**
 * ARQUIVO: client/src/lib/queryClient.ts
 * PROPÓSITO: Configuração do React Query para gerenciamento de estado de servidor
 * 
 * RESPONSABILIDADES:
 * - Criar instância configurada do QueryClient
 * - Definir funções auxiliares para requisições HTTP
 * - Configurar comportamento de cache e retries
 * - Gerenciar autenticação JWT em todas as requisições
 * 
 * CONCEITOS:
 * - React Query: Biblioteca para cache, sincronização e atualização de dados do servidor
 * - Query: Requisição GET que busca dados (cacheada automaticamente)
 * - Mutation: Requisição POST/PATCH/DELETE que modifica dados
 */

// QueryClient: Gerenciador central de cache e requisições
// QueryFunction: Tipo para funções que buscam dados
import { QueryClient, QueryFunction } from "@tanstack/react-query";

// ========================================
// FUNÇÃO AUXILIAR: VALIDAÇÃO DE RESPOSTA
// ========================================

/**
 * FUNÇÃO: throwIfResNotOk
 * PROPÓSITO: Valida resposta HTTP e lança erro se não ok
 * PARÂMETRO: res - Response object do fetch
 * COMPORTAMENTO:
 *   - res.ok (200-299): Não faz nada, continua execução
 *   - res.ok false: Lança erro com status code e mensagem
 * 
 * USO: await throwIfResNotOk(res) após cada fetch
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // EXTRAÇÃO: Tenta ler corpo da resposta como texto
    const text = (await res.text()) || res.statusText;
    
    // ERRO: Inclui status code e mensagem para depuração
    // EXEMPLO: "401: Access token required"
    throw new Error(`${res.status}: ${text}`);
  }
}

// ========================================
// FUNÇÃO AUXILIAR: REQUISIÇÃO GENÉRICA
// ========================================

/**
 * FUNÇÃO EXPORTADA: apiRequest
 * PROPÓSITO: Wrapper para fetch com autenticação automática
 * PARÂMETROS:
 *   - method: Método HTTP ("GET", "POST", "PATCH", "DELETE")
 *   - url: Endpoint da API (ex: "/api/orders")
 *   - data: Payload opcional (será JSON.stringify)
 * RETORNO: Promise<Response>
 * 
 * RECURSOS:
 * - Adiciona header Authorization automático se token existe
 * - Adiciona Content-Type: application/json se há dados
 * - Valida resposta e lança erro se falha
 * 
 * USO TÍPICO:
 *   const res = await apiRequest("POST", "/api/orders", orderData)
 *   const order = await res.json()
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // RECUPERAÇÃO: Busca token JWT do localStorage
  const token = localStorage.getItem('guriri_token');
  
  // CONFIGURAÇÃO: Headers dinâmicos baseados em contexto
  const headers: Record<string, string> = {
    // Adiciona Content-Type apenas se há dados (POST/PATCH)
    ...(data ? { "Content-Type": "application/json" } : {}),
    // Adiciona Authorization apenas se usuário está logado
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };

  // REQUISIÇÃO: Executa fetch com configurações
  const res = await fetch(url, {
    method,
    headers,
    // SERIALIZAÇÃO: Converte objeto JavaScript para JSON
    body: data ? JSON.stringify(data) : undefined,
    // COOKIES: Inclui cookies nas requisições cross-origin
    credentials: "include",
  });

  // VALIDAÇÃO: Lança erro se resposta não é 2xx
  await throwIfResNotOk(res);
  
  return res;
}

// ========================================
// TIPO: COMPORTAMENTO EM ERRO 401
// ========================================

/**
 * TIPO: UnauthorizedBehavior
 * PROPÓSITO: Define como tratar erro 401 Unauthorized
 * VALORES:
 *   - "returnNull": Retorna null sem lançar erro (para queries opcionais)
 *   - "throw": Lança erro normalmente (para dados obrigatórios)
 */
type UnauthorizedBehavior = "returnNull" | "throw";

// ========================================
// FUNÇÃO: QUERY FUNCTION FACTORY
// ========================================

/**
 * FUNÇÃO EXPORTADA: getQueryFn
 * PROPÓSITO: Cria QueryFunction configurada para React Query
 * PARÂMETRO: options.on401 - Como tratar erro de autenticação
 * RETORNO: QueryFunction<T> que busca dados
 * 
 * CONCEITO: Factory function que retorna função configurada
 * 
 * COMPORTAMENTO:
 * - Usa queryKey como URL (convenção React Query)
 * - Adiciona token JWT automaticamente
 * - Trata 401 conforme configuração
 * - Valida e retorna JSON
 * 
 * USO TÍPICO:
 *   useQuery({
 *     queryKey: ['/api/orders'],
 *     queryFn: getQueryFn({ on401: 'returnNull' })
 *   })
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // RECUPERAÇÃO: Busca token apenas no browser (não no SSR)
    const token = typeof window !== 'undefined' ? localStorage.getItem('guriri_token') : null;
    
    // CONFIGURAÇÃO: Headers com autenticação
    const headers: Record<string, string> = token 
      ? { "Authorization": `Bearer ${token}` } 
      : {};
    
    // REQUISIÇÃO: Fetch usando queryKey como URL
    // CONVENÇÃO: queryKey[0] = '/api', queryKey[1] = 'orders'
    // RESULTADO: '/api/orders'
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    // TRATAMENTO ESPECIAL: 401 com comportamento "returnNull"
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // VALIDAÇÃO: Lança erro se resposta não é 2xx
    await throwIfResNotOk(res);
    
    // DESERIALIZAÇÃO: Converte JSON para objeto JavaScript
    return await res.json();
  };

// ========================================
// INSTÂNCIA: QUERY CLIENT
// ========================================

/**
 * CONSTANTE EXPORTADA: queryClient
 * PROPÓSITO: Instância global do React Query Client
 * CONFIGURAÇÃO: Opções padrão para queries e mutations
 * 
 * USADO EM:
 * - App.tsx: <QueryClientProvider client={queryClient}>
 * - Componentes: useQuery(), useMutation()
 * 
 * CONFIGURAÇÕES APLICADAS:
 * 
 * queries (Busca de dados):
 *   - queryFn: Usa getQueryFn com "throw" para 401
 *   - refetchInterval: false - Não recarrega automaticamente
 *   - refetchOnWindowFocus: false - Não recarrega ao focar janela
 *   - staleTime: Infinity - Dados nunca ficam "stale" (sempre válidos)
 *   - retry: false - Não tenta novamente em caso de erro
 * 
 * mutations (Modificação de dados):
 *   - retry: false - Não tenta novamente em caso de erro
 * 
 * JUSTIFICATIVA DAS CONFIGURAÇÕES:
 * - staleTime: Infinity porque usamos WebSocket para atualizações em tempo real
 * - refetchOnWindowFocus: false para evitar requisições desnecessárias
 * - retry: false para falhar rápido e mostrar erro ao usuário
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
