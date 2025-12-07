# Frontend Architecture

> How the React client is organized after the service/hook refactor.

## Directory Map

| Path | Description |
|------|-------------|
| `client/src/pages/` | Route-level screens (central, client, driver dashboards, landing page). Keep these thin and declarative. |
| `client/src/components/` | Reusable UI primitives (cards, badges, forms). No business logic. |
| `client/src/adapters/` | Functions that normalize API data into UI-friendly shapes (e.g., `order-adapter.ts`). |
| `client/src/services/` | Pure functions that implement domain rules (filtering, grouping, calculations). These are fully unit-tested. |
| `client/src/hooks/` | Custom hooks (`use-order-filters`, `use-financial-reports`) that compose state + services for the UI. |
| `client/src/types/` | Shared TypeScript types (`financial.ts`, `orders.ts`). |
| `client/src/test-utils/` | Factories and helpers used by Vitest suites. |

## Data Lifecycle in the Central Dashboard

1. **Fetch:** TanStack Query loads raw `Order` records from the API.
2. **Normalize:** `normalizeOrders` converts the transport shape into `NormalizedOrder` with numeric + date helpers.
3. **Filter:** `use-order-filters` owns state (status/client/motoboy/date/search) and relies on `filterOrders` to produce `filteredOrders`.
4. **Aggregate:** `use-financial-reports` receives normalized orders, applies finance filters, and calls financial services to build summaries, snapshots, and pending/delivered buckets.
5. **Render:** Pages read data from hooks and pass it to stateless UI components (tables, cards, graphs).

```
React Query -> Adapter -> Services -> Hooks -> Components
```

## Design Principles

- **Single Source of Truth:** All business logic for filtering and aggregations lives in services. Hooks never duplicate calculations.
- **Testability:** Because services are pure, they can be tested independently. Hooks have focused tests through React Testing Library + custom factories.
- **Deterministic UI:** Hooks expose derived data and setter handlers, ensuring pages only worry about layout.
- **Type Safety:** Types pulled from `@shared/schema` ensure the frontend stays aligned with Drizzle schemas.

## React Query Usage

- Queries live close to pages (e.g., `central-dashboard.tsx`) but follow the `client/src/lib/queryClient.ts` setup.
- Cache keys follow the `['orders']`, `['clients', id]` pattern for predictability.
- All adapters/hooks assume the presence of TanStack Query data; they accept arrays (possibly empty) and return deterministic defaults.

## Adding New Dashboards

1. Scaffold a page under `client/src/pages/`.
2. Define domain services if new calculations appear; avoid embedding logic inside components.
3. Write a hook that wires state + services + React Query data.
4. Cover services/hooks with Vitest suites before wiring the UI.
5. Update docs if the domain introduces new KPIs or workflows.

## Performance Notes

- Expensive derivations sit inside `useMemo` blocks within hooks to avoid re-render storms.
- Dates are pre-parsed during normalization, so components never instantiate `Date` objects on every render.
- Searches are case-insensitive thanks to `normalizeText` inside `filterOrders`.

Use this file as the canonical reference for structuring new frontend features.
