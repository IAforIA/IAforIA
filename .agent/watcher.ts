import chokidar from 'chokidar';
import { join } from 'path';
import type { AgentConfig } from './validator.js';
import type { Notifier } from './notifier.js';

export async function startWatcher(opts: {
  prod: boolean;
  config: AgentConfig;
  notifier: Notifier;
}): Promise<void> {
  const { config, notifier } = opts;
  const watchPaths = (config.watch?.paths?.length ? config.watch.paths : ['server', 'client', 'shared']).map((p) => join(process.cwd(), p));
  const ignore = config.watch?.ignore ?? ['node_modules', 'dist', '.git'];

  await notifier.info(`Watcher ativo em: ${watchPaths.map((p) => p.replace(process.cwd(), '.')).join(', ')}`);

  const watcher = chokidar.watch(watchPaths, {
    ignored: (path) => ignore.some((i) => path.includes(i)),
    ignoreInitial: true
  });

  watcher.on('change', async (path) => {
    await notifier.debug(`change: ${path.replace(process.cwd(), '.')}`);
  });

  watcher.on('add', async (path) => {
    await notifier.debug(`add: ${path.replace(process.cwd(), '.')}`);
  });

  watcher.on('unlink', async (path) => {
    await notifier.debug(`unlink: ${path.replace(process.cwd(), '.')}`);
  });

  // Mantém o processo vivo.
  await new Promise<void>(() => {
    /* forever */
  });
}
