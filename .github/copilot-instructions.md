# Guriri Express - AI Coding Agent Instructions

## Project Overview
B2B delivery logistics platform connecting businesses with delivery drivers (motoboys). Three role-based dashboards (Central, Client, Driver) with real-time order management, GPS tracking, and automated driver assignment via WebSocket communication.

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
- Tables: users, motoboys, motoboyLocations, clients, orders, liveDocs, chatMessages
- Use `drizzle-zod` for automatic Zod schema generation from tables
- Push schema changes: `npm run db:push` (uses drizzle-kit)

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
- Connection managed per dashboard with `useEffect` cleanup
- Message types: `new_order`, `order_accepted`, `order_delivered`, `location_update`

```typescript
// Client pattern (see client/src/pages/central-dashboard.tsx:32)
useEffect(() => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const websocket = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`);
  
  websocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'new_order') refetchOrders();
  };
  
  return () => websocket.close();
}, [token]);

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
**The system has NO public registration** - all users must be manually created by administrators.

For launching within your company with pre-existing users:
- See `INICIO-RAPIDO.md` - Quick 4-step guide (35 minutes)
- See `LANCAMENTO-INTERNO.md` - Detailed internal launch guide
- Use `server/scripts/import-users.ts` - Bulk user import script

**Security by default:** No `/api/register` route exists - impossible for external users to create accounts.

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

