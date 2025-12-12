import { readFileSync } from 'fs';
import { join } from 'path';

export type AgentConfig = {
  enabled: boolean;
  dryRun: boolean;
  mode?: 'watch' | 'once';
  watch?: {
    paths?: string[];
    ignore?: string[];
  };
  patch?: {
    requireGitClean?: boolean;
    maxPatchBytes?: number;
  };
  notifications?: {
    telegram?: boolean;
    slack?: boolean;
  };
};

const DEFAULTS: AgentConfig = {
  enabled: false,
  dryRun: true,
  mode: 'watch',
  watch: {
    paths: ['server', 'client', 'shared'],
    ignore: ['node_modules', 'dist', '.git']
  },
  patch: {
    requireGitClean: true,
    maxPatchBytes: 256 * 1024
  },
  notifications: {
    telegram: false,
    slack: false
  }
};

export function getConfig(): AgentConfig {
  try {
    const cfgPath = join(process.cwd(), '.agent', 'config.json');
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8')) as Partial<AgentConfig>;
    return {
      ...DEFAULTS,
      ...cfg,
      watch: { ...DEFAULTS.watch, ...(cfg.watch ?? {}) },
      patch: { ...DEFAULTS.patch, ...(cfg.patch ?? {}) },
      notifications: { ...DEFAULTS.notifications, ...(cfg.notifications ?? {}) }
    };
  } catch {
    return DEFAULTS;
  }
}
