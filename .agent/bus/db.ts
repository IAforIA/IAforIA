export type DbEvent =
  | { type: 'slow_query'; durationMs: number; tag?: string }
  | { type: 'connection_error'; message: string };

export function emitDb(event: DbEvent): void {
  console.log('[agent:bus:db]', JSON.stringify(event));
}
