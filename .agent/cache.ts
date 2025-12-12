import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

type CacheValue = string | number | boolean | null | Record<string, unknown> | Array<unknown>;

function cachePath(): string {
  const dir = join(process.cwd(), '.agent', '.cache');
  mkdirSync(dir, { recursive: true });
  return join(dir, 'cache.json');
}

export function readCache(): Record<string, CacheValue> {
  try {
    return JSON.parse(readFileSync(cachePath(), 'utf-8')) as Record<string, CacheValue>;
  } catch {
    return {};
  }
}

export function writeCache(data: Record<string, CacheValue>): void {
  writeFileSync(cachePath(), JSON.stringify(data, null, 2), 'utf-8');
}
