import { db } from './db.js';
import { liveDocs } from '@shared/schema';

export async function createLiveDoc(doc: typeof liveDocs.$inferInsert) {
  const result = await db.insert(liveDocs).values(doc).returning();
  return result[0];
}
