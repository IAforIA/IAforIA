# Guriri Express - Frontend Patterns

> **Versão:** 2.1.0 | **Atualizado:** 2025-12-13

---

## 1. Estrutura de Hooks

### 1.1 Hooks Disponíveis

| Hook | Arquivo | Propósito |
|------|---------|-----------|
| `useAuth` | `hooks/use-auth.tsx` | Context de autenticação (login, logout, user) |
| `useCep` | `hooks/use-cep.ts` | Busca endereço via CEP (ViaCEP) |
| `useToast` | `hooks/use-toast.ts` | Notificações toast |
| `useFinancialReports` | `hooks/use-financial-reports.ts` | Filtros e cálculos financeiros |
| `useOrderFilters` | `hooks/use-order-filters.ts` | Filtros de pedidos por período |
| `useIsMobile` | `hooks/use-mobile.tsx` | Detecção de mobile |

---

### 1.2 useAuth

Gerencia autenticação JWT e estado do usuário.

```typescript
import { useAuth } from "@/hooks/use-auth";

function MyComponent() {
  const { user, token, login, logout, isAuthenticated } = useAuth();
  
  // user = { id, name, email, role, phone }
  // token = JWT string
  // isAuthenticated = boolean
}
```

**LocalStorage keys:**
- `guriri_token` - JWT token
- `guriri_user` - User object stringified

---

### 1.3 useCep ⭐ NOVO

Hook para buscar endereço via CEP usando ViaCEP API.

```typescript
import { useCep } from "@/hooks/use-cep";

function AddressForm() {
  const { fetchAddress, isLoading, error, formatCep } = useCep();
  
  const handleCepBlur = async (cepValue: string) => {
    const address = await fetchAddress(cepValue);
    if (address) {
      form.setValue("rua", address.rua);
      form.setValue("bairro", address.bairro);
      // address = { cep, rua, bairro, cidade, estado, complemento }
    }
  };
  
  return (
    <Input 
      placeholder="29900-000"
      onBlur={(e) => handleCepBlur(e.target.value)}
      disabled={isLoading}
    />
  );
}
```

**Métodos disponíveis:**
| Método | Retorno | Descrição |
|--------|---------|-----------|
| `fetchAddress(cep)` | `AddressFromCep \| null` | Busca endereço via ViaCEP |
| `normalizeCep(value)` | `string` | Remove formatação (só números) |
| `formatCep(value)` | `string` | Formata para 00000-000 |
| `isValidCep(cep)` | `boolean` | Valida se tem 8 dígitos |
| `reset()` | `void` | Limpa estado |

---

### 1.4 useToast

Sistema de notificações toast (shadcn/ui).

```typescript
import { useToast } from "@/hooks/use-toast";

function MyComponent() {
  const { toast } = useToast();
  
  // Sucesso
  toast({
    title: "Pedido criado",
    description: "O motoboy será notificado.",
  });
  
  // Erro
  toast({
    title: "Erro",
    description: "Não foi possível processar.",
    variant: "destructive",
  });
}
```

---

## 2. Data Fetching - React Query

### 2.1 Configuração Global

```typescript
// lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,      // WebSocket cuida das atualizações
      refetchOnWindowFocus: false,
      staleTime: Infinity,         // Dados nunca ficam "stale"
      retry: false,
    },
  },
});
```

### 2.2 apiRequest Helper

```typescript
import { apiRequest } from "@/lib/queryClient";

// GET
const res = await apiRequest("GET", "/api/orders");
const orders = await res.json();

// POST
const res = await apiRequest("POST", "/api/orders", {
  destinatarioNome: "João",
  valor: "15.00",
  // ...
});

// PATCH
await apiRequest("PATCH", "/api/users/123", { name: "Novo Nome" });
```

**Funcionalidades:**
- Adiciona `Authorization: Bearer <token>` automaticamente
- Adiciona `Content-Type: application/json` para body
- Lança erro se response não OK (401, 403, etc.)

### 2.3 Padrões de Query

```typescript
// Lista simples
const { data: orders, refetch } = useQuery<Order[]>({
  queryKey: ['/api/orders'],
});

// Com parâmetros
const { data } = useQuery<Order[]>({
  queryKey: ['/api/orders', { status: 'pending' }],
});

// Reports (formato wrapper)
const { data: report } = useQuery<
  { success: boolean; data: MotoboyReport },
  Error,
  MotoboyReport
>({
  queryKey: ['/api/reports/motoboys', motoboyId],
  select: (response) => response?.data,  // Extrai data do wrapper
});
```

### 2.4 Padrões de Mutation

```typescript
const createOrderMutation = useMutation({
  mutationFn: async (data: OrderFormData) => {
    const res = await apiRequest("POST", "/api/orders", data);
    return res.json();
  },
  onSuccess: (order) => {
    toast({ title: "Pedido criado!" });
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
  },
  onError: (error) => {
    toast({ 
      title: "Erro", 
      description: error.message,
      variant: "destructive" 
    });
  },
});

// Uso
createOrderMutation.mutate({ destinatarioNome: "João", ... });
```

---

## 3. WebSocket Pattern

### 3.1 Conexão nos Dashboards

```typescript
// CRÍTICO: Usar useRef para evitar loops infinitos
const refetchRef = useRef(refetch);
refetchRef.current = refetch;

useEffect(() => {
  if (!token) return;
  
  const ws = new WebSocket(resolveWebSocketUrl(token));
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'new_order':
      case 'order_accepted':
      case 'order_delivered':
        refetchRef.current();  // Usar ref, NÃO função direta
        break;
    }
  };
  
  return () => ws.close();
}, [token]); // NÃO incluir refetch nas dependências!
```

### 3.2 resolveWebSocketUrl Helper

```typescript
function resolveWebSocketUrl(token: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws?token=${token}`;
}
```

---

## 4. Formulários

### 4.1 Stack Padrão

- `react-hook-form` - Gerenciamento de estado
- `zod` - Validação de schema
- `@hookform/resolvers/zod` - Integração
- `shadcn/ui Form` - Componentes UI

### 4.2 Pattern de Formulário

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  nome: z.string().min(3, "Mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  cep: z.string().regex(/^\d{8}$/, "CEP inválido"),
});

type FormValues = z.infer<typeof formSchema>;

function MyForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: "", email: "", cep: "" },
  });
  
  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Salvar</Button>
      </form>
    </Form>
  );
}
```

### 4.3 Campos de Endereço com CEP Auto-Fill ⭐

```typescript
import { useCep } from "@/hooks/use-cep";

function AddressFields({ form }) {
  const { fetchAddress, isLoading } = useCep();
  
  const handleCepBlur = async (cep: string) => {
    const address = await fetchAddress(cep);
    if (address) {
      form.setValue("rua", address.rua, { shouldDirty: true });
      form.setValue("bairro", address.bairro, { shouldDirty: true });
      toast({ title: "Endereço preenchido" });
    }
  };
  
  return (
    <>
      {/* CEP PRIMEIRO - OBRIGATÓRIO */}
      <FormField
        name="cep"
        render={({ field }) => (
          <FormItem>
            <FormLabel>CEP *</FormLabel>
            <FormControl>
              <Input
                inputMode="numeric"
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleCepBlur(e.target.value);
                }}
                disabled={isLoading}
              />
            </FormControl>
            {isLoading && <p className="text-xs">Buscando...</p>}
          </FormItem>
        )}
      />
      
      {/* Campos preenchidos automaticamente */}
      <FormField name="rua" ... />
      <FormField name="bairro" ... />
      <FormField name="numero" ... /> {/* Manual */}
    </>
  );
}
```

---

## 5. Componentes de UI

### 5.1 Estrutura de Dashboards

```tsx
// pages/[role]-dashboard.tsx
<SidebarProvider>
  <div className="flex min-h-screen">
    <AppSidebar role="client" />
    <SidebarInset className="flex-1">
      <Header />
      <main className="p-4 md:p-6">
        <NestedRouter base="/client">
          <Route path="/" component={Overview} />
          <Route path="/orders" component={Orders} />
          <Route path="/settings" component={Settings} />
        </NestedRouter>
      </main>
    </SidebarInset>
  </div>
</SidebarProvider>
```

### 5.2 StatCard Pattern

```tsx
<StatCard
  title="Entregas Hoje"
  value={stats.todayDeliveries}
  icon={Package}
  trend={{ value: 12, direction: "up" }}
/>
```

### 5.3 OrderCard Pattern

```tsx
<OrderCard
  order={order}
  onAccept={() => acceptMutation.mutate(order.id)}
  onDeliver={() => setDeliverDialogOpen(true)}
  showActions={user?.role === "motoboy"}
/>
```

---

## 6. Regras de UX

### 6.1 CEP Obrigatório Primeiro

> ⚠️ **REGRA CRÍTICA:** Todo campo de endereço DEVE ter CEP como primeiro campo,
> com preenchimento automático via ViaCEP.

**Ordem dos campos:**
1. CEP (obrigatório, com auto-fill)
2. Rua (preenchido automaticamente)
3. Bairro (preenchido automaticamente)
4. Número (manual)
5. Complemento (opcional)
6. Referência (opcional)

### 6.2 Feedback de Loading

Sempre mostrar estado de loading:
```tsx
{isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
```

### 6.3 Dark Mode

Usar classes Tailwind com suporte a dark:
```tsx
<div className="bg-background text-foreground">
<p className="text-muted-foreground">
```

---

## Próximos Documentos

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Visão geral do sistema
- [API-REFERENCE.md](./API-REFERENCE.md) - Endpoints da API
- [WEBSOCKET-EVENTS.md](./WEBSOCKET-EVENTS.md) - Eventos em tempo real
- [BACKEND-PATTERNS.md](./BACKEND-PATTERNS.md) - Padrões do backend
