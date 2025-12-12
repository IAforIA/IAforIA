import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { config as loadEnv } from 'dotenv';
import { startWatcher } from './watcher.js';
import { createNotifier } from './notifier.js';
import { getConfig } from './validator.js';
import { runAutopilotLoop } from './autopilot.js';

// Load environment variables from .env on startup (PM2/npm won't do this automatically).
loadEnv();

function ensureDirs(): void {
  mkdirSync(join(process.cwd(), '.agent', 'logs'), { recursive: true });
  mkdirSync(join(process.cwd(), '.agent', 'learning'), { recursive: true });
  mkdirSync(join(process.cwd(), '.agent', '.cache'), { recursive: true });
}

function isEnabled(): boolean {
  const enabledEnv = (process.env.ENABLE_AGENT_ZERO || '').toLowerCase();
  if (enabledEnv === 'true' || enabledEnv === '1' || enabledEnv === 'yes') return true;

  try {
    const cfgPath = join(process.cwd(), '.agent', 'config.json');
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
    return Boolean(cfg?.enabled);
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const prod = process.argv.includes('--prod');
  ensureDirs();

  const notifier = createNotifier({ prod });
  const config = getConfig();

  if (!isEnabled()) {
    await notifier.info('Agent-Zero está desativado (ENABLE_AGENT_ZERO != true e config.enabled=false). Saindo sem mudanças.');
    process.exit(0);
  }

  await notifier.info(`Agent-Zero iniciado (${prod ? 'prod' : 'dev'}) em modo seguro (dryRun=${String(config.dryRun)}).`);

  // Modo padrão: autopilot (mais útil em VPS). Use --watch para modo watcher.
  const forceWatch = process.argv.includes('--watch');
  const mode = forceWatch ? 'watch' : (config.mode || 'autopilot');

  if (mode === 'watch') {
    await startWatcher({ prod, config, notifier });
    return;
  }

  await runAutopilotLoop({ prod, config, notifier });
}

main().catch((err) => {
  // Intencionalmente minimalista: logs no stdout para PM2 capturar.
  console.error('[agent] fatal:', err);
  process.exit(1);
});
