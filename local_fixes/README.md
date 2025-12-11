# Local Fix Pack (do not commit directly)

This folder contains local-only stubs and reports to help apply two safe fixes:

1) PATCH `/api/users/:id` allowing only `name`, `phone`, `address`, `avatarUrl`.
2) Compatibility GET `/api/clients/:id/schedules` wrapper that delegates to the aggregate schedules service and filters by `clientId`.

## Files

- `report_inspection.json` / `report_summary.md`: route/env/WS/frontend findings.
- `snapshot_tests.log`: outputs from npm ci/lint/test/build + smokes (filled after you run).
- `snapshot_meta.json`: metadata of generated artifacts.
- `patches/controllers/patchUserController.stub.ts`: controller stub with whitelist + validation TODOs.
- `patches/routes/usersRoute.stub.ts`: example route registration using existing auth middleware.
- `patches/routes/clientsSchedulesWrapper.stub.ts`: wrapper stub delegating to schedules aggregate.
- `tests/users.patch.test.stub.ts`: integration skeleton to adapt.

## How to apply safely

1. Ensure working tree safety:
   - Option A: `git stash push -m "pre-fix"` to clean the tree temporarily.
   - Option B: create a branch preserving dirty state: `git checkout -b fix/users-patch-temp` (keeps files unchanged).
2. Copy stubs into real files:
   - Wire controller import into `server/routes/users.ts` (or separate controller file) and attach middleware `authenticateToken` + `requireRole('central')` unless you allow self-service updates.
   - Implement service call (e.g., `storage.updateUser` or `usersService.updateUser`) replacing TODO.
   - For schedules wrapper, reuse existing `storage.getAllClientSchedules()` or the aggregate service and filter by `clientId`; mount under `/api` router before return.
3. Run checks before committing:
   - `npm ci`
   - `npm run lint`
   - `npm test --runInBand`
   - `npm run build`
4. Smoke after apply (adjust IDs/tokens):
   - `curl -i http://127.0.0.1:5000/health`
   - `curl -i http://127.0.0.1:5000/api/motoboys/locations/latest`
   - `curl -i http://127.0.0.1:5000/api/schedules/all-clients`
   - `curl -i http://127.0.0.1:5000/api/reports/motoboys/<TEST_ID>`
   - `curl -i http://127.0.0.1:5000/api/clients/<CLIENT_ID>/schedules`
   - `curl -i -X PATCH http://127.0.0.1:5000/api/users/<TEST_ID> -H "Content-Type: application/json" -d '{"name":"Smoke User"}'`
   - WS: connect to `ws://127.0.0.1:5000/ws?token=<JWT>` and watch for events (`new_order`, `order_*`, `chat_message`, `driver_online/offline`).
5. Commit/branch guidance (after validation):
   - `git checkout -b fix/users-patch-<date>`
   - `git add <modified files>` (avoid adding .env/secrets)
   - `git commit -m "feat(api): add PATCH /api/users/:id (safe fields)"`
   - Push + PR manually.

## Notes

- Do not commit `.env` or secrets; if they appear staged, unstage with `git restore --staged .env*`.
- Keep middleware/auth unchanged; only add new routes/controllers.
- If tests fail, keep the logs in `snapshot_tests.log` for review before retrying.
