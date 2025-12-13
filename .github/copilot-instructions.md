# Guriri Express - AI Coding Agent Instructions

## Project Overview
B2B delivery logistics platform connecting businesses with delivery drivers (motoboys). Three role-based dashboards (Central, Client, Driver) with real-time order management, GPS tracking, and automated driver assignment via WebSocket communication.

---

## ⚠️ ARCHITECTURAL GOVERNANCE — READ FIRST

This document is the **architectural constitution** of the project. Its purpose is to:
- Prevent regression and breaking changes
- Enforce domain boundary discipline
- Maintain API contract stability
- Ensure predictable system behavior under growth

**Any code generation that violates these rules is considered a critical bug.**

---

## Domain & Business Logic Boundaries — CRITICAL

### Where Business Logic MUST Live
All business logic that impacts **order status**, **permissions**, **pricing**, **billing**, **SLA**, or **driver assignment** MUST be implemented in **domain services**.

| Layer | Responsibility | Business Logic? |
|-------|---------------|-----------------|
| `server/routes/*.ts` | HTTP adapters, request/response | ❌ NO |
| `server/storage.ts` | CRUD operations, data access | ❌ NO |
| `server/services/*.ts` | Domain logic, decisions, workflows | ✅ YES |
| `server/ai-engine.ts` | Suggestions, recommendations | ❌ NO (suggests only) |
| `client/src/**` | UI rendering, user interaction | ❌ NO |

### Prohibited Locations for Business Logic
```typescript
// ❌ PROIBIDO - Lógica de negócio em rotas
router.post('/orders/:id/accept', async (req, res) => {
  if (order.status === 'pending') { // ← Regra de negócio na rota!
    order.status = 'in_progress';   // ← ERRADO
  }
});

// ✅ CORRETO - Rota apenas delega para service
router.post('/orders/:id/accept', async (req, res) => {
  const result = await OrderService.acceptOrder(orderId, motoboyId);
  res.json(result);
});
```

### Domain Logic Examples
The following are **domain logic** and MUST live in services:
- Order state transitions (`pending` → `in_progress` → `delivered`)
- Driver assignment rules and availability checks
- Pricing calculations (base, distance, time modifiers)
- Permission enforcement (who can cancel, reassign, etc.)
- SLA validations and deadline checks
- Billing/repasse calculations

---

## Frontend vs Backend Responsibilities — CRITICAL

### The Golden Rule
> **Backend is the SINGLE SOURCE OF TRUTH. Frontend only reflects decisions.**

### Frontend Restrictions
| Action | Frontend | Backend |
|--------|----------|---------|
| Validate business rules | ❌ | ✅ |
| Decide state transitions | ❌ | ✅ |
| Apply permissions | ❌ | ✅ |
| Calculate prices | ❌ | ✅ |
| Filter by role | ❌ | ✅ |
| Display data | ✅ | - |
| UX validations (format) | ✅ | - |
| Optimistic UI updates | ✅ (revert on error) | - |

### Prohibited Pattern
```typescript
// ❌ PROIBIDO - Validação de permissão no frontend
if (user.role === 'central') {
  setCanCancelOrder(true); // ← Frontend decidindo permissão!
}

// ✅ CORRETO - Backend retorna permissões
const { canCancel } = await api.get('/orders/:id/permissions');
```

### Why This Matters
- Frontend can be bypassed (devtools, API calls)
- Business rules must be enforced server-side
- Duplicated logic leads to inconsistencies
- "Resolver no React porque é mais rápido" → **NUNCA**

---

## API Contracts & Backward Compatibility — CRITICAL

### Contract Stability Rules
| Action | Allowed? |
|--------|----------|
| Add new optional fields | ✅ |
| Add new endpoints | ✅ |
| Remove existing fields | ❌ NEVER |
| Rename existing fields | ❌ NEVER |
| Change field types | ❌ NEVER |
| Change response shape | ❌ NEVER |

### Breaking Changes = Critical Bugs
Any change that breaks existing clients is a **P0 critical bug**. If a breaking change is absolutely necessary:
1. Create versioned endpoint (`/api/v2/...`)
2. Maintain old endpoint for deprecation period
3. Document migration path

### Contract Documentation
All API contracts are documented in:
- `docs/API-REFERENCE.md` — Endpoint specifications
- `shared/contracts.ts` — TypeScript DTOs and Zod schemas

**Before modifying any endpoint, consult these files.**

---

## Decision Authority Model — CRITICAL

### Who Decides What

```
┌─────────────────────────────────────────────────────────────┐
│                    DECISION AUTHORITY                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Routes (server/routes/*.ts)                               │
│   └─► Receive request, validate input, delegate            │
│   └─► ❌ DO NOT DECIDE                                      │
│                                                             │
│   Storage (server/storage.ts)                               │
│   └─► Execute CRUD, return data                             │
│   └─► ❌ DO NOT DECIDE                                      │
│                                                             │
│   AI Engine (server/ai-engine.ts)                           │
│   └─► Suggest assignments, prices, responses                │
│   └─► ❌ DO NOT DECIDE (recommendations only)               │
│                                                             │
│   Services (server/services/*.ts)                           │
│   └─► Apply business rules, enforce invariants              │
│   └─► ✅ DECIDE (single authority)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Current Domain Services
| Service | Responsibility |
|---------|---------------|
| `OrderService` | Order lifecycle, state transitions |
| `PricingService` | Dynamic pricing calculations |
| `AssignmentService` | Driver assignment logic |
| `GeocodingService` | Address → coordinates |

> If a service doesn't exist for a domain, **create it** before implementing logic.

---

## Anti-Patterns — NEVER DO THIS

### Prohibited Patterns

| Anti-Pattern | Why It's Wrong |
|--------------|----------------|
| Business logic in routes | Routes are adapters, not decision makers |
| Validation only in frontend | Backend must be the gatekeeper |
| Refactoring for aesthetics | Only refactor with clear technical debt justification |
| Breaking API contracts | Breaks all existing clients |
| Duplicating business rules | Single source of truth or bugs guaranteed |
| Creating undocumented states | If it's not in schema, it doesn't exist |
| Inferring missing requirements | Ask, don't guess |
| "Completing" unspecified features | Implement only what's explicitly requested |
| Using `any` type | Always define explicit types |
| Hardcoding role strings | Use type-safe role enums |

### The Golden Rule for Uncertainty
> **When in doubt, SUGGEST — do not implement.**

If requirements are unclear:
1. State your understanding
2. List assumptions
3. Ask for confirmation
4. Only then implement

---

## AI Autonomy Levels

### Level 1: Suggest Only (Requires Human Approval)
- Domain logic changes
- API contract modifications
- Pricing/billing logic
- Permission changes
- Database schema changes
- New business rules

### Level 2: Implement with Validation (Can Proceed, Must Verify)
- New features within existing patterns
- New endpoints following existing conventions
- UI components following design system
- Test implementations

### Level 3: Autonomous (Can Execute Freely)
- Bug fixes with clear root cause
- TypeScript typing improvements
- Code organization (within 500-line limit)
- Documentation updates
- Linting/formatting fixes
- Import organization

---

## Code Organization Rules - CRITICAL

### TypeScript - NUNCA usar `any`
- **PROIBIDO usar `any`** - Sempre definir tipos explícitos
- Se encontrar `any` no código, **substituir imediatamente** por tipo correto
- Usar `unknown` + type guards quando tipo é realmente desconhecido
- Tipar todas as funções: parâmetros E retorno

```typescript
// ❌ PROIBIDO
function process(data: any) { ... }
const result: any = await fetch(...);

// ✅ CORRETO
function process(data: Order): ProcessedOrder { ... }
const result: ApiResponse<Order> = await fetch(...);
```

### File Size Limits
- **Maximum 500 lines per file** - Split larger files into smaller modules
- If a file exceeds 500 lines, refactor into separate components/modules

### Component Organization
- **Single Responsibility Principle** - Each component/module handles ONE concern
- Split complex components into smaller, focused sub-components
- Example: `ChatWidget.tsx` → `ChatHeader.tsx`, `ChatMessageList.tsx`, `ChatThreadList.tsx`, `ChatInput.tsx`

### Function Guidelines
- **Small and focused functions** - Each function does ONE thing well
- Maximum ~50 lines per function (prefer shorter)
- Extract reusable logic into custom hooks or utility functions
- Use descriptive function names that explain what they do

### Directory Structure for Large Features
```
feature/
├── index.tsx          # Main component (re-exports)
├── FeatureHeader.tsx  # Sub-component
├── FeatureList.tsx    # Sub-component
├── FeatureItem.tsx    # Sub-component
├── hooks/
│   └── useFeature.ts  # Feature-specific hooks
├── utils/
│   └── helpers.ts     # Feature-specific utilities
└── types.ts           # Feature-specific types
```

## Architecture & Stack

### Monorepo Structure
- **`client/`**: React 18 + TypeScript frontend (Vite build)
- **`server/`**: Express.js backend with WebSocket server
- **`shared/`**: Shared TypeScript types and Drizzle schemas

### Key Technologies
- **Frontend**: React 18, Wouter (routing), TanStack Query, shadcn/ui, Tailwind CSS
- **Backend**: Express.js, Drizzle ORM, WebSocket (ws), JWT auth
- **Database**: PostgreSQL via Neon serverless (@neondatabase/serverless)
- **Build**: Vite (client), esbuild (server), tsx for dev

### Module System - CRITICAL
This project uses **ES Modules** (`.js` extensions required in imports):
```typescript
// ✅ CORRECT - Always use .js extension in server imports
import { registerRoutes } from "./routes.js";
import { storage } from "./storage.js";

// ❌ WRONG - Will cause module resolution errors
import { registerRoutes } from "./routes";
```

## Development Workflows

### Running the Application
```bash
npm run dev           # Start dev server (port 5000) - runs tsx server/index.ts
npm run build         # Build for production (Vite + esbuild)
npm start             # Run production build
npm run db:push       # Push schema changes to database
```

**Environment Setup**: 
- Copy `.env.example` to `.env` and configure required variables
- Required: `DATABASE_URL`, `JWT_SECRET`
- Optional: `SESSION_SECRET`, `PORT` (defaults to 5000)

**First Time Setup**:
```bash
npm install          # Install dependencies (cross-env for cross-platform compatibility)
npm run db:push      # Initialize database schema
# Optional: npx tsx server/scripts/seed-users.ts
```

### Database Schema Management
- Schema defined in `shared/schema.ts` using Drizzle ORM
- Tables: users, motoboys, motoboyLocations, motoboySchedules, clients, clientSchedules, orders, liveDocs, chatMessages
- Use `drizzle-zod` for automatic Zod schema generation from tables
- Push schema changes: `npm run db:push` (uses drizzle-kit)

### Motoboy Bank Data (added 2025-12-12)
The `motoboys` table includes banking fields for payment processing:
- `pixKey`, `pixKeyType` (cpf, phone, email, random)
- `bankName`, `bankCode`, `bankAgency`, `bankAccount`, `bankAccountDigit`, `bankAccountType`, `bankHolderName`
- These are edited in Settings page, NOT during registration (security)

## Code Patterns & Conventions

### Authentication Flow
1. Login expects **email** (not id) + password at `/api/auth/login`
2. Returns JWT token with `{id, role}` payload (24h expiration)
3. Client stores token + user in localStorage (`guriri_user`, `guriri_token`)
4. API requests use `Authorization: Bearer <token>` header
5. Middleware stack: `authenticateToken` → `requireRole(...roles)`

```typescript
// Server: JWT middleware in server/middleware/auth.ts
export function authenticateToken(req, res, next) { /* ... */ }
export function requireRole(...allowedRoles) { /* ... */ }

// Usage in routes
router.post("/api/orders", authenticateToken, requireRole('client', 'central'), async (req, res) => {
  // Only clients and central can create orders
});
```

### WebSocket Real-Time Updates
- Server: WebSocket server in `server/index.ts` with global `broadcast()` function
- Authentication: Token passed as query param (`/ws?token=<JWT>`)
- Connection managed per dashboard with `useEffect` cleanup + `useRef` for refetch
- Message types: `new_order`, `order_accepted`, `order_delivered`, `location_update`, `chat_message`

```typescript
// Client pattern - CRITICAL: Use useRef to avoid infinite loops
// See client/src/pages/driver-dashboard.tsx for reference
const refetchRef = useRef(refetch);
refetchRef.current = refetch;

useEffect(() => {
  const websocket = new WebSocket(resolveWebSocketUrl(token));
  
  websocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'new_order') refetchRef.current(); // Use ref, not direct function
  };
  
  return () => websocket.close();
}, [token]); // Do NOT include refetch in dependencies

// Server broadcast pattern (server/index.ts:55)
export function broadcast(message: any, excludeId?: string) {
  wsClients.forEach((ws, id) => {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}
```

### Path Aliases
```typescript
// Configured in tsconfig.json and vite.config.ts
"@/*"       → "./client/src/*"     // Client components/utilities
"@shared/*" → "./shared/*"          // Shared schemas/types
"@assets/*" → "./attached_assets/*" // Static assets
```

### Data Layer Pattern
- **Storage abstraction**: `server/storage.ts` (DrizzleStorage class)
- Methods return `result[0]` for single records, arrays for collections
- Location tracking uses separate `motoboyLocations` table (not inline on motoboys)
- Decimal fields (lat/lng, prices) stored as strings, parse with `parseFloat()` or `AIEngine.parseDecimal()`

```typescript
// Example: Getting user by email (server/storage.ts:37)
async getUserByEmail(email: string) {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0]; // Returns single record or undefined
}
```

### AI Engine Service
Located in `server/ai-engine.ts` - handles:
- Automated driver assignment based on GPS distance + availability
- Dynamic pricing based on distance, time of day, day of week
- Auto-response generation for chat messages

**Important**: Order schema currently lacks `coletaLat`/`coletaLng` fields - geocoding integration needed for production use.

## Design System (see design_guidelines.md)

### Component Patterns
- **KPI Stats**: 4-card grid with icon, large number, trend indicator
- **Order Cards**: Compact layout with origin→destination, status badge, driver avatar
- **Sidebar**: Fixed 256px (`w-64`), role-based navigation, collapsible mobile
- **Forms**: react-hook-form + Zod validation, shadcn/ui form components
- **Typography**: Inter font, body text at `0.875rem`, data display uses `font-mono`
- **Spacing**: Tailwind primitives (2, 4, 6, 8, 12), component padding `p-4` or `p-6`

### Role-Based Dashboards
Each dashboard at `/client/src/pages/[role]-dashboard.tsx` uses:
- `SidebarProvider` + `AppSidebar` with role prop
- Nested routing via `<NestedRouter base="/[role]">`
- WebSocket connection for real-time updates
- TanStack Query hooks for data fetching

## Common Pitfalls

1. **Import extensions**: Always use `.js` in server-side imports (ES modules)
2. **Decimal parsing**: Database decimals are strings - use `parseFloat()` before math operations
3. **Authentication**: Login uses `email` field, not `id` (common confusion)
4. **WebSocket auth**: Pass token as query param, not header (WS limitation)
5. **Location data**: Stored in separate `motoboyLocations` table, not on `motoboys` table
6. **Role names**: Use exact strings: `'client'`, `'central'`, `'motoboy'` (case-sensitive)

## Testing & Debugging

- **Error pages**: Check `client/public/diagnostico.html` and `error-capture.html` for debugging
- **Test routes**: `client/src/pages/test-simple.tsx` available at `/test`
- **Console logging**: Server logs API requests automatically (method, path, status, duration, response)
- **Database inspection**: Use Drizzle Studio or direct PostgreSQL client

## Documentação Técnica

Consulte os docs em `docs/` antes de fazer alterações:
- **[ARCHITECTURE.md](../docs/ARCHITECTURE.md)** - Visão geral do sistema, fluxos, stack
- **[API-REFERENCE.md](../docs/API-REFERENCE.md)** - Todos os endpoints com payloads
- **[WEBSOCKET-EVENTS.md](../docs/WEBSOCKET-EVENTS.md)** - Eventos em tempo real

## Extending the System

### Adding New API Endpoints
1. Define route in `server/routes.ts`
2. Add authentication middleware: `authenticateToken, requireRole(...)`
3. Use `storage` methods for database operations
4. Broadcast WebSocket events if updates needed: `broadcast({type: 'event_name', payload})`

### Adding New Database Tables
1. Define table in `shared/schema.ts` with Drizzle syntax
2. Create insert schema: `createInsertSchema(tableName).omit({...})`
3. Export types: `type Insert[Name]`, `type [Name]`
4. Run `npm run db:push` to apply migration
5. Add storage methods in `server/storage.ts`

### Adding New Dashboard Views
1. Create route in respective dashboard's `<NestedRouter>`
2. Add sidebar link in `client/src/components/app-sidebar.tsx`
3. Implement component with TanStack Query hooks
4. Subscribe to WebSocket events if real-time updates needed

## Deployment

This project was migrated from Replit and is now deployment-agnostic. See `DEPLOYMENT.md` for comprehensive deployment instructions.

### Internal Launch (Private Company Use)
**The system has self-registration** for clients and motoboys via the landing page.

#### Registration Endpoints:
- **Clients:** `POST /api/auth/register` - Full company registration with address
- **Motoboys:** `POST /api/auth/register/motoboy` - Driver self-registration (added 2025-12-12)

For bulk import of pre-existing users:
- See `INICIO-RAPIDO.md` - Quick 4-step guide (35 minutes)
- See `LANCAMENTO-INTERNO.md` - Detailed internal launch guide
- Use `server/scripts/import-users.ts` - Bulk user import script

**Security notes:**
- Rate limiting: 3 registration attempts per 15 minutes per IP
- Motoboy PIX/bank data collected separately in Settings (not during registration)
- Motoboy registration creates default schedules (all shifts enabled)

### Quick Deploy Options
- **Docker**: `docker-compose up -d` (includes PostgreSQL)
- **Railway**: `railway up` (auto-provisions PostgreSQL)
- **Render**: Connect Git repo, add PostgreSQL addon
- **VPS**: PM2 + Nginx reverse proxy (see DEPLOYMENT.md)

### Removed Replit Dependencies
The following Replit-specific packages have been removed:
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`
- `@replit/vite-plugin-runtime-error-modal`

**Migration Note**: These were development-only plugins for Replit IDE integration and are not needed for standard deployments.

### Environment Differences
- **Cross-platform scripts**: Uses `cross-env` for Windows/Linux/Mac compatibility
- **Standard PostgreSQL**: Works with any PostgreSQL provider (Neon, Supabase, Railway, etc.)
- **Port configuration**: Configurable via `PORT` env var (defaults to 5000)

---

## Order Lifecycle — CANONICAL REFERENCE

### Valid Order States
```
pending → in_progress → delivered
    ↓
cancelled
```

### State Transition Rules
| From | To | Trigger | Who Can Do |
|------|-----|---------|------------|
| `pending` | `in_progress` | Motoboy accepts | motoboy, central |
| `pending` | `cancelled` | Central cancels | central |
| `in_progress` | `delivered` | Motoboy confirms + LiveDoc | motoboy |
| `in_progress` | `cancelled` | Central cancels | central |

### Assignment Flow
1. **Client creates order** → `status: pending`, `motoboyId: null`
2. **Central assigns** → `status: pending`, `motoboyId: X`
3. **Motoboy accepts** → `status: in_progress`, `motoboyId: X`
4. **Motoboy declines** → `status: pending`, `motoboyId: null` (back to pool)
5. **Motoboy delivers** → `status: delivered` + LiveDoc obrigatório

### WebSocket Events
| Event | Trigger | Payload |
|-------|---------|---------|
| `new_order` | Order created | Full order object |
| `order_accepted` | Motoboy accepts | Order with in_progress status |
| `order_declined` | Motoboy declines | Order back to pending |
| `order_delivered` | Delivery confirmed | Order with proofUrl |
| `order_cancelled` | Central cancels | Order with cancelled status |
| `order_reassigned` | Central reassigns | Order with new motoboyId |

---

## Summary Checklist for AI Agent

Before generating any code, verify:

- [ ] Business logic is in a service, not route/storage/frontend
- [ ] API contracts are preserved (no breaking changes)
- [ ] Types are explicit (no `any`)
- [ ] File stays under 500 lines
- [ ] Decision authority is respected
- [ ] State transitions follow documented flow
- [ ] WebSocket events are broadcast for relevant changes
- [ ] Frontend only reflects backend decisions

