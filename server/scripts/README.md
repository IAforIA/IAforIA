# Chat migration scripts

This folder contains migration scripts for chat message schema changes.

Usage:

- Non-destructive: Add `sender_id`/`receiver_id` columns and backfill from `from_id`/`to_id` if present.

  ```bash
  npx tsx server/scripts/migrate-add-sender-receiver.ts
  ```

- Full migration: Replace chat messages table with a simplified schema (destructive, use with caution):

  ```bash
  npx tsx server/scripts/migrate-chat-table.ts
  ```

Notes:
- `migrate-add-sender-receiver.ts` is safe and non-destructive: it ensures the canonical columns exist and populates them using legacy columns when needed.
- If you plan to drop legacy columns, ensure that all clients are migrated and server logs show no usage of legacy fields. You can run `npm run test` and inspect logs for `legacy_chat_fields_used` events.
- Always backup your database prior to running migration scripts.
