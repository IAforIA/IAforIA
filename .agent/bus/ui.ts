export type UIEvent =
  | { type: 'toast'; level: 'info' | 'warn' | 'error'; message: string }
  | { type: 'progress'; message: string; percent?: number };

export function emitUI(event: UIEvent): void {
  // Minimal bus: stdout. Pode ser integrado depois com websocket/UI.
  console.log('[agent:bus:ui]', JSON.stringify(event));
}
