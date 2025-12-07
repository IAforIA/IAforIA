# Testing Strategy

> Practical guide for validating the shared services + hooks stack.

## Tooling

- **Test Runner:** Vitest 2.x (`npm run test`)
- **Environment:** jsdom (configured in `vite.config.ts`)
- **Assertions:** built-in `expect` + @testing-library/react for hook rendering
- **Test Utilities:** `client/src/test-utils/order-factories.ts` centralizes fixture creation

## What We Cover Today

| Layer | Files | Goal |
|-------|-------|------|
| Services | `client/src/services/__tests__/*.test.ts` | Guarantee filtering, grouping, and financial math remain deterministic. |
| Hooks | `client/src/hooks/__tests__/*.test.tsx` | Ensure state transitions, memoized outputs, and filter handlers behave as expected. |

## When to Add Tests

1. **New Domain Rule** – e.g., a different payout algorithm → add/update a service test.
2. **Hook State Changes** – e.g., new filter slider → add a hook test verifying state + derived outputs.
3. **Bug Fixes** – write a regression test first whenever reproducing an issue.

## Running the Suite

```bash
npm run test
```

Vitest watches for changes when invoked with `--watch`, but the default script runs once (used in CI).

## Writing Service Tests

1. Import `createOrder` helpers from `client/src/test-utils/order-factories.ts` to keep fixtures readable.
2. Arrange a minimal dataset; prefer explicit numeric values to avoid relying on defaults.
3. Assert on the returned arrays/summaries only (services should remain pure).

```ts
import { filterOrders } from "@/services/orders";
import { createOrder } from "@/test-utils/order-factories";

test("filters by motoboy", () => {
  const orders = [createOrder({ motoboyId: "A" }), createOrder({ motoboyId: "B" })];
  const result = filterOrders(orders, { ...defaultFilters, motoboyId: "A" });
  expect(result).toHaveLength(1);
});
```

## Writing Hook Tests

Use `renderHook` from Testing Library.

```ts
import { renderHook, act } from "@testing-library/react";
import { useOrderFilters } from "@/hooks/use-order-filters";

const { result } = renderHook(() => useOrderFilters([createRawOrder()]));
act(() => result.current.handleOrderStatusFilterChange("delivered"));
expect(result.current.filteredOrders).toMatchObject([{ status: "delivered" }]);
```

## Adding Coverage for Future Features

- Prefer colocating new specs near the code under test.
- Keep tests deterministic by mocking `Date.now()` if the behavior depends on "today".
- Record failing scenarios inside the spec description ("should ignore invalid dates"), then reference them in PR descriptions.

## CI Considerations

- `npm run test` should be added to deployment pipelines right after `npm run build`.
- Flaky tests: open an issue with failing reproduction steps and the fixture data set.

Following this strategy keeps the business logic reliable as dashboards evolve.
