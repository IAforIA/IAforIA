import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Non-destructive migration: ensure sender_id and receiver_id columns exist and backfill
 * from legacy columns from_id/to_id if present.
 * Run: npx tsx server/scripts/migrate-add-sender-receiver.ts
 */

async function migrate() {
  console.log('🔧 Starting non-destructive migration for chat_messages (add sender_id / receiver_id if missing)');
  try {
    // Add columns if not present
    await db.execute(sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_id VARCHAR`);
    await db.execute(sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS receiver_id VARCHAR`);

    console.log('✅ Ensured sender_id and receiver_id columns exist');

    // Backfill from legacy columns if sender_id/receiver_id are null
    await db.execute(sql`
      UPDATE chat_messages
      SET sender_id = from_id
      WHERE sender_id IS NULL AND from_id IS NOT NULL
    `);

    await db.execute(sql`
      UPDATE chat_messages
      SET receiver_id = to_id
      WHERE receiver_id IS NULL AND to_id IS NOT NULL
    `);

    console.log('✅ Backfill complete (sender_id/receiver_id set from legacy columns where applicable)');

    // Count rows to verify
    const result1 = await db.execute(sql`SELECT COUNT(*) FROM chat_messages WHERE sender_id IS NULL`);
    const result2 = await db.execute(sql`SELECT COUNT(*) FROM chat_messages WHERE receiver_id IS NULL`);
    console.log('Rows with missing sender_id:', result1.rows?.[0]?.count ?? 'unknown');
    console.log('Rows with missing receiver_id:', result2.rows?.[0]?.count ?? 'unknown');

    console.log('ℹ️ Non-destructive migration completed. Old columns from_id/to_id remain intact for compatibility.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
