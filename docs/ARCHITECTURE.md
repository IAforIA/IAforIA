# Guriri Express - Arquitetura do Sistema

> **Versão:** 2.1.0 | **Atualizado:** 2025-12-13

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estrutura de Pastas](#3-estrutura-de-pastas)
4. [Fluxo de Autenticação](#4-fluxo-de-autenticação)
5. [WebSocket - Comunicação em Tempo Real](#5-websocket---comunicação-em-tempo-real)
6. [Padrões de API](#6-padrões-de-api)
7. [Frontend - React Query Patterns](#7-frontend---react-query-patterns)
8. [Banco de Dados](#8-banco-de-dados)

---

## 1. Visão Geral

O Guriri Express é uma plataforma B2B de logística de entregas que conecta empresas (clientes) com entregadores (motoboys). O sistema possui **três dashboards** baseados em roles:

```
┌─────────────────────────────────────────────────────────────────┐
│                        GURIRI EXPRESS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   CENTRAL   │    │   CLIENT    │    │   DRIVER    │         │
│  │  Dashboard  │    │  Dashboard  │    │  Dashboard  │         │
│  │             │    │             │    │             │         │
│  │ - Gerencia  │    │ - Cria      │    │ - Aceita    │         │
│  │   todos os  │    │   pedidos   │    │   entregas  │         │
│  │   pedidos   │    │ - Acompanha │    │ - Confirma  │         │
│  │ - Motoboys  │    │   status    │    │   entrega   │         │
│  │ - Clientes  │    │ - Histórico │    │ - GPS       │         │
│  │ - Finanças  │    │             │    │             │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
│                    ┌───────▼───────┐                            │
│                    │   WebSocket   │                            │
│                    │   (Tempo Real)│                            │
│                    └───────┬───────┘                            │
│                            │                                    │
│                    ┌───────▼───────┐                            │
│                    │  Express.js   │                            │
│                    │    Backend    │                            │
│                    └───────┬───────┘                            │
│                            │                                    │
│                    ┌───────▼───────┐                            │
│                    │  PostgreSQL   │                            │
│                    │   (Neon)      │                            │
│                    └───────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo Principal de um Pedido

```
1. Cliente cria pedido ──────► POST /api/orders
                                    │
2. Backend salva no DB ◄────────────┘
         │
3. WebSocket broadcast ─────► { type: "new_order", payload: order }
         │
4. Driver Dashboard recebe ◄────────┘
         │
5. Driver aceita ───────────► POST /api/orders/:id/accept
         │
6. WebSocket broadcast ─────► { type: "order_accepted", payload }
         │
7. Cliente/Central recebem ◄────────┘
         │
8. Driver envia comprovante ► POST /api/upload/livedoc
         │                     (imagem obrigatória para finalizar)
         │
9. LiveDoc salvo no DB ◄──────┘
         │    └─► Vinculado ao pedido (orderId)
         │    └─► Acessível para: Motoboy, Cliente, Central
         │
10. Driver entrega ─────────► POST /api/orders/:id/deliver
         │                     (requer LiveDoc já enviado)
         │
11. WebSocket broadcast ────► { type: "order_delivered", payload }
         │                     └─► Inclui referência ao LiveDoc
         │
12. Todos podem verificar ◄──┘
         └─► Central: Auditoria e controle
         └─► Cliente: Confirmação de entrega
         └─► Motoboy: Histórico pessoal
```

> **⚠️ IMPORTANTE:** O envio do LiveDoc (comprovante de entrega) é **obrigatório** 
> antes de finalizar o pedido. Isso garante rastreabilidade e permite conferência
> instantânea por todas as partes (motoboy, cliente e central).

---

## 2. Stack Tecnológico

### Frontend (client/)
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| React | 18.x | UI Library |
| TypeScript | 5.x | Type Safety |
| Vite | 6.x | Build Tool / Dev Server |
| TanStack Query | 5.x | Data Fetching / Cache |
| Wouter | 3.x | Routing (lightweight) |
| shadcn/ui | - | Component Library |
| Tailwind CSS | 3.x | Styling |
| Lucide React | - | Icons |

### Backend (server/)
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Express.js | 4.x | HTTP Server |
| ws | 8.x | WebSocket Server |
| Drizzle ORM | 0.3x | Database ORM |
| Zod | 3.x | Validation |
| JWT | - | Authentication |
| bcrypt | - | Password Hashing |

### Database
| Tecnologia | Provider | Propósito |
|------------|----------|-----------|
| PostgreSQL | Neon Serverless | Primary Database |
| Drizzle Kit | - | Migrations |

### Shared (shared/)
| Arquivo | Propósito |
|---------|-----------|
| schema.ts | Drizzle table definitions + Zod schemas |
| contracts.ts | DTOs e validation schemas compartilhados |
| enums.ts | Enums compartilhados |

---

## 3. Estrutura de Pastas

```
GuririExpress/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── components/        # Componentes reutilizáveis
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── chat/          # Chat components (modularizado)
│   │   │   ├── OrderCard.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── ...
│   │   ├── hooks/             # Custom React Hooks
│   │   │   ├── use-auth.tsx
│   │   │   ├── use-toast.ts
│   │   │   ├── use-financial-reports.ts
│   │   │   └── use-order-filters.ts
│   │   ├── lib/               # Utilities
│   │   │   ├── queryClient.ts # React Query config
│   │   │   └── utils.ts       # cn() helper
│   │   ├── pages/             # Route components
│   │   │   ├── landing.tsx
│   │   │   ├── central-dashboard.tsx
│   │   │   ├── client-dashboard.tsx
│   │   │   ├── driver-dashboard.tsx
│   │   │   ├── central/       # Nested routes
│   │   │   ├── client/
│   │   │   └── driver/
│   │   ├── services/          # Business logic
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx            # Root component
│   └── index.html
│
├── server/                    # Backend Express
│   ├── routes/                # API routes (modularizado)
│   │   ├── index.ts           # Route aggregator
│   │   ├── auth.ts            # /api/auth/*
│   │   ├── orders.ts          # /api/orders/*
│   │   ├── motoboys.ts        # /api/motoboys/*
│   │   ├── clients.ts         # /api/clients/*
│   │   ├── users.ts           # /api/users/*
│   │   ├── chat.ts            # /api/chat/*
│   │   ├── reports.ts         # /api/reports/*
│   │   ├── analytics.ts       # /api/analytics/*
│   │   ├── uploads.ts         # /api/upload/*
│   │   ├── schedules.ts       # /api/schedules/*
│   │   └── health.ts          # /api/health, /api/ready
│   ├── reports/               # Report generators
│   │   ├── motoboy-report.ts
│   │   └── client-report.ts
│   ├── middleware/
│   │   └── auth.ts            # JWT middleware
│   ├── ws/
│   │   └── broadcast.js       # WebSocket helpers
│   ├── storage.ts             # Database access layer
│   ├── ai-engine.ts           # AI assignment/pricing
│   └── index.ts               # Server entry point
│
├── shared/                    # Shared types/schemas
│   ├── schema.ts              # Drizzle tables + Zod
│   ├── contracts.ts           # DTOs
│   └── enums.ts
│
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md        # Este arquivo
│   ├── API-REFERENCE.md
│   └── ...
│
└── .github/
    └── copilot-instructions.md  # AI agent instructions
```

---

## 4. Fluxo de Autenticação

### 4.1 Login Flow

```
┌─────────────┐     POST /api/auth/login      ┌─────────────┐
│   Frontend  │ ─────────────────────────────► │   Backend   │
│             │   { email, password }          │             │
│             │                                │  1. Busca   │
│             │                                │     user    │
│             │                                │  2. Valida  │
│             │                                │     bcrypt  │
│             │     { token, user }            │  3. Gera    │
│             │ ◄───────────────────────────── │     JWT     │
│             │                                │             │
│  4. Salva   │                                │             │
│  localStorage                                │             │
└─────────────┘                                └─────────────┘
```

### 4.2 JWT Payload

```typescript
// Token gerado em server/routes/auth.ts
{
  id: string,      // User ID (UUID)
  role: 'client' | 'motoboy' | 'central',
  name: string,    // Nome do usuário
  iat: number,     // Issued at
  exp: number      // Expira em 24h
}
```

### 4.3 LocalStorage Keys

| Key | Conteúdo | Usado em |
|-----|----------|----------|
| `guriri_token` | JWT string | Todas as requisições API |
| `guriri_user` | JSON stringified user object | UI, role checks |

### 4.4 Middleware Stack

```typescript
// server/middleware/auth.ts

// 1. Extrai e valida JWT
authenticateToken(req, res, next)
  → Lê header Authorization: Bearer <token>
  → Verifica JWT com JWT_SECRET
  → Adiciona req.user = { id, role, name }

// 2. Verifica permissão de role
requireRole(...allowedRoles)
  → Verifica se req.user.role está em allowedRoles
  → Retorna 403 se não autorizado
```

### 4.5 Exemplo de Rota Protegida

```typescript
// Apenas central pode listar todos os motoboys
router.get('/motoboys', 
  authenticateToken,           // Valida JWT
  requireRole('central'),      // Apenas central
  async (req, res) => { ... }
);

// Motoboy ou central podem aceitar pedidos
router.post('/orders/:id/accept',
  authenticateToken,
  requireRole('motoboy', 'central'),
  async (req, res) => { ... }
);
```

---

## 5. WebSocket - Comunicação em Tempo Real

### 5.1 Conexão

```typescript
// Frontend: client/src/pages/*-dashboard.tsx
const websocket = new WebSocket(
  `${protocol}//${window.location.host}/ws?token=${jwtToken}`
);

// Backend: server/index.ts
// Valida token na conexão e associa userId ao socket
```

### 5.2 Eventos Broadcast

| Evento | Trigger | Payload | Quem Escuta |
|--------|---------|---------|-------------|
| `new_order` | POST /api/orders | Order object | Central, Drivers |
| `order_accepted` | POST /api/orders/:id/accept | Order object | Central, Client |
| `order_delivered` | POST /api/orders/:id/deliver | Order object | Central, Client |
| `order_cancelled` | PATCH /api/orders/:id/cancel | Order object | All dashboards |
| `order_reassigned` | PATCH /api/orders/:id/reassign | Order object | Central, Drivers |
| `chat_message` | POST /api/chat | ChatMessage | Related users |
| `driver_online` | WS connection open | { id } | Central |
| `driver_offline` | WS connection close | { id } | Central |

### 5.3 Padrão de Uso no Frontend

```typescript
// CRÍTICO: Usar useRef para evitar loops infinitos
const refetchRef = useRef(refetch);
refetchRef.current = refetch;

useEffect(() => {
  if (!token) return;
  
  let websocket: WebSocket;
  websocket = new WebSocket(resolveWebSocketUrl(token));
  
  websocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Refetch dados quando receber eventos relevantes
    if (['new_order', 'order_accepted', 'order_delivered'].includes(data.type)) {
      refetchRef.current();
    }
  };
  
  return () => websocket?.close();
}, [token]); // NÃO incluir refetch nas dependências
```

### 5.4 Server Broadcast

```typescript
// server/ws/broadcast.js
export function broadcast(message: any, excludeId?: string) {
  wsClients.forEach((ws, id) => {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

// Uso em rotas
import { broadcast } from '../ws/broadcast.js';

router.post('/orders/:id/accept', async (req, res) => {
  // ... lógica
  broadcast({ type: 'order_accepted', payload: order });
  res.json(order);
});
```

---

## 6. Padrões de API

### 6.1 Formatos de Resposta

**IMPORTANTE:** Existem dois formatos de resposta no sistema:

#### Formato 1: Objeto Direto (maioria das rotas)
```json
// GET /api/orders, POST /api/orders, etc.
{
  "id": "uuid",
  "clientId": "uuid",
  "status": "pending",
  ...
}
// ou array direto
[{ "id": "..." }, { "id": "..." }]
```

#### Formato 2: Wrapper { success, data } (rotas de reports)
```json
// GET /api/reports/motoboys/:id, GET /api/reports/clients/:id
{
  "success": true,
  "data": {
    "stats": { ... },
    "breakdown": { ... },
    "recentOrders": [ ... ]
  }
}
```

### 6.2 Como Consumir no Frontend

```typescript
// Formato 1 - Objeto direto
const { data: orders } = useQuery<Order[]>({
  queryKey: ['/api/orders']
});

// Formato 2 - Wrapper (usar select para extrair)
const { data: report } = useQuery<
  { success: boolean; data: MotoboyReport },
  Error,
  MotoboyReport
>({
  queryKey: ['/api/reports/motoboys', motoboyId],
  select: (response) => response?.data  // Extrai o objeto data
});
```

### 6.3 Códigos de Erro Padrão

| Código | Significado | Quando Ocorre |
|--------|-------------|---------------|
| 400 | Bad Request | Validação falhou (Zod) |
| 401 | Unauthorized | Token ausente ou inválido |
| 403 | Forbidden | Role não tem permissão |
| 404 | Not Found | Recurso não existe |
| 500 | Internal Error | Erro no servidor |

---

## 7. Frontend - React Query Patterns

### 7.1 QueryClient Configuration

```typescript
// client/src/lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,      // Não recarrega automaticamente
      refetchOnWindowFocus: false, // WebSocket cuida das atualizações
      staleTime: Infinity,         // Dados nunca ficam "stale"
      retry: false,                // Falha rápido
    },
  },
});
```

### 7.2 apiRequest Helper

```typescript
// Wrapper para fetch com JWT automático
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const token = localStorage.getItem('guriri_token');
  
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  
  await throwIfResNotOk(res);
  return res;
}
```

### 7.3 Hooks Customizados

| Hook | Arquivo | Propósito |
|------|---------|-----------|
| `useAuth` | hooks/use-auth.tsx | Context de autenticação |
| `useToast` | hooks/use-toast.ts | Notificações toast |
| `useFinancialReports` | hooks/use-financial-reports.ts | Filtros e cálculos financeiros |
| `useOrderFilters` | hooks/use-order-filters.ts | Filtros de pedidos |
| `useIsMobile` | hooks/use-mobile.tsx | Detecção de mobile |

---

## 8. Banco de Dados

### 8.1 Tabelas Principais

| Tabela | Propósito |
|--------|-----------|
| `users` | Usuários (todos os roles) |
| `motoboys` | Perfil específico de motoboys (1:1 com users) |
| `clients` | Perfil específico de clientes (1:1 com users) |
| `orders` | Pedidos de entrega |
| `motoboyLocations` | Histórico de localização GPS |
| `motoboySchedules` | Disponibilidade por dia/turno |
| `clientSchedules` | Horários de funcionamento |
| `chatMessages` | Mensagens do chat |
| `liveDocs` | Documentos/arquivos enviados |

### 8.2 Relacionamentos

```
users (1) ────── (1) motoboys
users (1) ────── (1) clients
users (1) ────── (N) orders (como client)
motoboys (1) ─── (N) orders (como motoboy)
motoboys (1) ─── (N) motoboyLocations
motoboys (1) ─── (N) motoboySchedules
clients (1) ──── (N) clientSchedules
orders (1) ───── (N) chatMessages
```

### 8.3 Campos Importantes

#### Order Status Flow
```
pending ──► in_progress ──► delivered
    │                          
    └──────► cancelled
```

#### Motoboy Bank Data (para repasses)
```typescript
// Campos em motoboys table
pixKey: string
pixKeyType: 'cpf' | 'phone' | 'email' | 'random'
bankName, bankCode, bankAgency, bankAccount, bankAccountDigit
bankAccountType: 'corrente' | 'poupanca'
bankHolderName: string
```

---

## Próximos Documentos

- [API-REFERENCE.md](./API-REFERENCE.md) - Referência completa de endpoints
- [WEBSOCKET-EVENTS.md](./WEBSOCKET-EVENTS.md) - Eventos em tempo real
- [FRONTEND-PATTERNS.md](./FRONTEND-PATTERNS.md) - Padrões do frontend
