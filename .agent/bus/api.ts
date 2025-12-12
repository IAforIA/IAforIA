export type ApiEvent =
  | { type: 'request_failed'; method: string; path: string; status?: number; reqId?: string }
  | { type: 'spike'; path: string; count: number; windowSeconds: number };

export function emitApi(event: ApiEvent): void {
  console.log('[agent:bus:api]', JSON.stringify(event));
}
