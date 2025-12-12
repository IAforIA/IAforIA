import { readFileSync } from 'fs';
import { join } from 'path';

export type AgentConfig = {
  enabled: boolean;
  dryRun: boolean;
  mode?: 'watch' | 'autopilot';
  pm2?: {
    appName?: string;
    canaryName?: string;
  };
  ports?: {
    main?: number;
    canary?: number;
  };
  autopilot?: {
    intervalSeconds?: number;
    logScanLines?: number;
    maxFixAttemptsPerIncident?: number;
    allowPaths?: string[];
    denyPaths?: string[];
    checks?: {
      runBuild?: boolean;
      runTests?: boolean;
    };
    smoke?: {
      path?: string;
      timeoutMs?: number;
    };
  };
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
  mode: 'autopilot',
  pm2: {
    appName: 'guriri',
    canaryName: 'guriri-canary'
  },
  ports: {
    main: 5000,
    canary: 5010
  },
  autopilot: {
    intervalSeconds: 60,
    logScanLines: 220,
    maxFixAttemptsPerIncident: 2,
    allowPaths: ['server/', 'client/', 'shared/', 'tests/', 'scripts/'],
    denyPaths: ['.env', '.env.', 'migrations/', 'uploads/', 'datasets/', '.agent/'],
    checks: {
      runBuild: true,
      runTests: false
    },
    smoke: {
      path: '/health',
      timeoutMs: 5000
    }
  },
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
      pm2: { ...DEFAULTS.pm2, ...(cfg.pm2 ?? {}) },
      ports: { ...DEFAULTS.ports, ...(cfg.ports ?? {}) },
      autopilot: { ...DEFAULTS.autopilot, ...(cfg.autopilot ?? {}) },
      patch: { ...DEFAULTS.patch, ...(cfg.patch ?? {}) },
      notifications: { ...DEFAULTS.notifications, ...(cfg.notifications ?? {}) }
    };
  } catch {
    return DEFAULTS;
  }
}
