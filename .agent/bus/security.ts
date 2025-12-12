export type SecurityEvent =
  | { type: 'rate_limit'; ip: string; path?: string }
  | { type: 'auth_fail'; ip?: string; userId?: string }
  | { type: 'blocked'; ip: string; reason: string };

export function emitSecurity(event: SecurityEvent): void {
  console.log('[agent:bus:security]', JSON.stringify(event));
}
