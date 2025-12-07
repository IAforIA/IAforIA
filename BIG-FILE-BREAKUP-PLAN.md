# Big File Breakup Plan

Purpose: shrink oversized backend files into cohesive modules, landing each step with a green build before moving on. Sequence is ordered; do not start the next step until the previous one builds cleanly.

## Target files (current sizes)

- `server/storage.ts` ~31 KB
- `server/reports.ts` ~29 KB
- `server/ai-engine.ts` ~25 KB
- `shared/schema.ts` ~21 KB

## Sequenced tasks (gated by green build)

1. Storage split (foundation)

- Create `server/storage/` folder with focused modules: `users.ts`, `motoboys.ts`, `orders.ts`, `clients.ts`, `locations.ts`, `schedules.ts`, `chat.ts`, `analytics.ts`.
- Move functions from `server/storage.ts` into matching modules; keep only exports and wiring in `server/storage/index.ts`.
- Update imports across server routes/services to use the new module paths (or index aggregator).
- Gate: run `npm run build` (and any quick route smoke tests if available) before proceeding.

1. Reports split (depends on 1)

- Create `server/reports/` with submodules: `company-report.ts`, `client-report.ts`, `motoboy-report.ts`, `orders-report.ts`, plus a small `index.ts` to compose.
- Route layer (`server/routes/reports.ts`) should import only from the new modules.
- Gate: run `npm run build` after refactor.

1. AI engine split (independent; can follow 2)

- Create `server/ai-engine/` with `assignment.ts`, `pricing.ts`, `chat-responder.ts`, `utils.ts`, and an `index.ts` facade.
- Ensure any shared helpers (distance, time windows) live in `utils.ts` and are reused.
- Gate: run `npm run build` after refactor.

1. Schema organization (optional, lower priority)

- If desired, move table definitions into `shared/schema/` subfiles by domain (`users.ts`, `motoboys.ts`, `orders.ts`, `chat.ts`, `finance.ts`) and re-export from `shared/schema/index.ts`.
- Coordinate with Drizzle config to point to the new glob if changed.
- Gate: run `npm run build` and the DB migration command `npm run db:push` (only if schema paths change) after verification.

## Execution rules

- Only start the next numbered step after the previous one builds cleanly (`npm run build`).
- Keep PR-sized chunks small: move a domain at a time, commit once it builds.
- Preserve ES module import style with explicit `.js` extensions on server-side imports.
- Re-run quick API smoke (if available) after each step; otherwise rely on `npm run build`.

## Next action

- Begin with Step 1 (Storage split): create `server/storage/index.ts` scaffolding and move one domain (e.g., `users`) first, then run `npm run build` before moving the rest.
