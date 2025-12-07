# Guriri Express – System Overview

> High-level description of how the platform is structured after the November 2025 refactor.

## Macro Architecture

| Layer | Stack | Responsibilities | Entry Points |
|-------|-------|------------------|--------------|
| **Client (React)** | Vite 5, React 18, TypeScript, TanStack Query, shadcn/ui | Dashboards for Central, Clientes e Motoboys, state management, local filtering, UI composition. | `client/src/main.tsx`, `client/src/pages/*` |
| **Server (Express)** | Node 18, Express, Drizzle ORM, Socket.IO | REST API, WebSocket updates, authentication, rate limiting, persistence orchestrations. | `server/index.ts`, `server/routes.ts`, `server/vite.ts` |
| **Shared Schema** | TypeScript, Drizzle, Zod | Single source of truth for DB tables and DTOs reused by server and client. | `shared/schema.ts`, `shared/contracts.ts` |
| **Infrastructure** | PostgreSQL (Neon), Docker (optional) | Durable data storage, background scripts, deployment automation. | `docker-compose.yml`, `docs/deployment/*` |

## Data Flow

1. **Acquisition** – REST endpoints (`/api/orders`, `/api/me/profile`, etc.) populate TanStack Query caches on the client.
2. **Normalization** – Client adapters (`client/src/adapters/order-adapter.ts`) convert raw Drizzle records into typed `NormalizedOrder` objects with numeric values and derived date strings.
3. **Pure Services** – Domain services (`client/src/services/*.ts`) encapsulate filtering/aggregation logic so that hooks and tests share the same implementations.
4. **Hooks & UI** – Hooks (`client/src/hooks/*.ts`) orchestrate state, memoization, and service calls, exposing UI-ready data consumed by dashboard pages.
5. **Side Channels** – WebSockets broadcast realtime updates (location, new orders); Storage scripts (`server/scripts/*.ts`) seed or migrate data using the shared schema.

## Execution Topology

- `npm run dev` launches Express, WebSocket, and Vite in a single process (`server/index.ts` embeds Vite middleware for local dev).
- `start-server.ps1` ensures the correct environment on Windows, including `.env` loading and Neon connectivity.
- Production deployments use the compiled server (`dist/`) + static build served by the same Express instance; Docker and Railway instructions live under `docs/deployment/`.

## Cross-Cutting Concerns

- **Authentication:** JWT middleware (`server/middleware/auth.ts`) injects the `userId` and `role` used across routes.
- **Auditing:** Scripts under `docs/reports/` log security posture and audit findings. `STATUS-ATUAL.md` summarizes the operational state.
- **Testing:** Services and hooks now have Vitest suites (`client/src/services/__tests__`, `client/src/hooks/__tests__`). See `testing-strategy.md` for details.
- **Documentation:** All platform knowledge lives under `docs/` with dedicated sections for architecture, deployment, and security.

## Key Workflows

- **Cadastro PF/PJ:** `POST /api/auth/register` creates both the user and client with address locking. Client dashboard reads the profile via `/api/me/profile` and enforces fixed pickup data until the "Emergência" override is toggled.
- **Central Dashboard Analytics:** React Query loads `/api/orders`; `use-order-filters` + `use-financial-reports` derive UI-ready KPIs without duplicating logic.
- **Motoboy Payouts:** Delivered orders feed `groupOrdersByMotoboy`, generating payout snapshots for weekly reconciliation.

Use this overview to orient new contributors before diving into detailed guides.
