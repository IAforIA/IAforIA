export type PerfEvent =
  | { type: 'high_cpu'; percent: number }
  | { type: 'high_memory'; rssBytes: number };

export function emitPerf(event: PerfEvent): void {
  console.log('[agent:bus:perf]', JSON.stringify(event));
}
