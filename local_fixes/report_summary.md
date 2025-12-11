# Local Inspection Summary

## Inspection Summary (local-only)

- **Scope**: server/routes mapped (auth, orders, chat, reports, motoboys, clients, users, analytics, uploads, schedules, health), WS events, env usage, and sampled frontend API calls.
- **Key routes**: orders CRUD/status; chat + AI suggest/feedback; reports (company/clients/motoboys/orders) plus alias `/api/reports/motoboys/:id`; motoboys CRUD + locations/latest + schedules; clients CRUD + `/clients/:id/schedules`; users listing/status/role; analytics dashboard/revenue/mrr; uploads; schedules all-clients/all-motoboys; health.
- **WS events emitted**: `driver_online`, `driver_offline` (index.ts); `chat_message`, `chat_ai_suggestion_available` (chat.ts); `new_order`, `order_accepted`, `order_delivered`, `order_cancelled`, `order_reassigned` (orders.ts).
- **Env keys referenced**: DATABASE_URL, JWT_SECRET, SESSION_SECRET, PORT, WS_PORT, NODE_ENV, FRONTEND_URL, BACKEND_URL, ALLOWED_ORIGINS, OPENAI_API_KEY, OPENAI_FINETUNED_MODEL_CEO, OPENAI_FINETUNED_MODEL_COMUNICACAO, OPENAI_BASE_MODEL, OPENAI_MODE, SLACK_WEBHOOK_URL, AI_CHAT_PORT, CENTRAL_USER_ID, TEST_AUTH_EMAIL, TEST_AUTH_PASSWORD.
- **Frontend calls (sample)**: central dashboard hits `/api/schedules/all-clients`, `/api/schedules/all-motoboys`, `/api/motoboys/locations/latest`; client dashboard fetches `/api/clients/:id/schedules`, `/api/reports/clients/:id`; driver dashboard fetches `/api/reports/motoboys/:id` and posts accept/deliver; central orders uses `/api/orders/:id/cancel` and `/reassign`; central drivers toggles `/api/motoboys/:id/online`; central users hits `/api/users/:id/status|role`.
- **Gaps noted**: no PATCH `/api/users/:id` for safe profile fields; ensure `/api/clients/:id/schedules` delegates to aggregate schedules service for consistency.
- **Artifacts generated**: see `local_fixes/` for stubs (controllers/routes/tests), snapshot logs, and meta.
