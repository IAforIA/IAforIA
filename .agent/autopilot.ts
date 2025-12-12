import OpenAI from 'openai';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { AgentConfig } from './validator.js';
import type { Notifier } from './notifier.js';
import { applyUnifiedDiffPatch } from './patcher.js';
import { readCache, writeCache } from './cache.js';
import { smokeHealth } from './smoke.js';

type Incident = {
  fingerprint: string;
  excerpt: string;
};

function pm2Home(): string {
  return process.env.PM2_HOME || join(process.env.HOME || process.cwd(), '.pm2');
}

function tailLines(filePath: string, maxLines: number): string {
  if (!existsSync(filePath)) return '';
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  return lines.slice(Math.max(0, lines.length - maxLines)).join('\n');
}

function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function getIncidentFromPm2Logs(cfg: AgentConfig): Incident | null {
  const appName = cfg.pm2?.appName || 'guriri';
  const errorLog = join(pm2Home(), 'logs', `${appName}-error.log`);
  const outLog = join(pm2Home(), 'logs', `${appName}-out.log`);

  const excerpt = [
    `# ${appName}-error.log (tail)`,
    tailLines(errorLog, cfg.autopilot?.logScanLines ?? 220),
    '',
    `# ${appName}-out.log (tail)`,
    tailLines(outLog, Math.max(40, Math.floor((cfg.autopilot?.logScanLines ?? 220) / 3)))
  ].join('\n');

  const minimal = excerpt.trim();
  if (!minimal) return null;

  // Heurística: só considera incidente se tiver sinais claros de erro.
  const looksBad = /\b(error|exception|unhandled|stack|500\b|EACCES|ECONNREFUSED|ETIMEDOUT|Sequelize|Drizzle|Postgres|neon|TypeError|ReferenceError)\b/i.test(minimal);
  if (!looksBad) return null;

  const fingerprint = hashText(minimal);
  return { fingerprint, excerpt: minimal };
}

function runCmd(cmd: string, args: string[], env?: NodeJS.ProcessEnv): { ok: boolean; out: string } {
  try {
    const out = execFileSync(cmd, args, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: env ? { ...process.env, ...env } : process.env,
    });
    return { ok: true, out };
  } catch (err: any) {
    const out = String(err?.stdout || '') + String(err?.stderr || err?.message || err);
    return { ok: false, out };
  }
}

function ensureGitClean(requireClean: boolean): void {
  if (!requireClean) return;
  const res = runCmd('git', ['status', '--porcelain']);
  if (!res.ok) throw new Error(`git status falhou: ${res.out}`);
  if (res.out.trim().length > 0) throw new Error('Working tree não está limpo (git status --porcelain não vazio).');
}

function snapshotHead(): string {
  const res = runCmd('git', ['rev-parse', 'HEAD']);
  if (!res.ok) throw new Error(`git rev-parse falhou: ${res.out}`);
  return res.out.trim();
}

function rollbackTo(ref: string): void {
  runCmd('git', ['reset', '--hard', ref]);
}

function buildContextForModel(cfg: AgentConfig, incident: Incident, lastActionLog: string): string {
  const allow = (cfg.autopilot?.allowPaths ?? []).join(', ');
  const deny = (cfg.autopilot?.denyPaths ?? []).join(', ');

  return [
    'Você é um agente de correção de bugs para um app Node/Express + React/Vite.',
    'Gere APENAS um patch em formato unified diff (git apply). Sem explicações, sem markdown.',
    'Regras obrigatórias:',
    `- Pode modificar somente caminhos que comecem com: ${allow || '(nenhum definido)'}.`,
    `- NÃO pode tocar em: ${deny || '(nenhum definido)'}.`,
    '- Não pode alterar package scripts, infra, Docker, nginx, ou secrets.',
    '- Mudanças pequenas e seguras; preferir correção local (root-cause) com mínimo impacto.',
    '- Se não tiver certeza, gere um patch NO-OP (patch vazio).',
    '',
    'SINAIS DO INCIDENTE (logs):',
    incident.excerpt.slice(0, 14000),
    '',
    'ÚLTIMA EXECUÇÃO DO AGENTE (para evitar loop):',
    lastActionLog.slice(0, 2000)
  ].join('\n');
}

async function askOpenAIForPatch(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não está configurada.');

  const model = process.env.OPENAI_BASE_MODEL || 'gpt-4o-mini';
  const client = new OpenAI({ apiKey });

  const resp = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'Responda somente com unified diff aplicável por git apply. Nada além disso.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
  });

  return (resp.choices?.[0]?.message?.content || '').trim();
}

function looksLikeUnifiedDiff(text: string): boolean {
  return /^diff --git\s/m.test(text) || (/^\+\+\+\s/m.test(text) && /^---\s/m.test(text));
}

function withinPathPolicy(cfg: AgentConfig, patchText: string): boolean {
  const allow = cfg.autopilot?.allowPaths ?? [];
  const deny = cfg.autopilot?.denyPaths ?? [];

  // Extrai paths de linhas '+++ b/...' e '--- a/...'
  const paths = patchText
    .split(/\r?\n/)
    .filter((l) => l.startsWith('+++ b/') || l.startsWith('--- a/'))
    .map((l) => l.replace(/^\+\+\+ b\//, '').replace(/^--- a\//, '').trim())
    .filter((p) => p && p !== '/dev/null');

  if (paths.length === 0) return true;

  for (const p of paths) {
    if (deny.some((d) => p.startsWith(d) || p.includes(d))) return false;
    if (allow.length > 0 && !allow.some((a) => p.startsWith(a))) return false;
  }

  return true;
}

function ensureCanaryStarted(cfg: AgentConfig, notifier: Notifier): void {
  const canaryName = cfg.pm2?.canaryName || 'guriri-canary';
  const port = String(cfg.ports?.canary ?? 5001);
  const mainPort = String(cfg.ports?.main ?? 5000);

  // Se canary já existe, só garante env atualizado.
  const list = runCmd('pm2', ['jlist']);
  if (list.ok && list.out.includes(`"name":"${canaryName}"`)) {
    runCmd('pm2', ['restart', canaryName, '--update-env'], {
      PORT: port,
      WS_PORT: String(Number(port) + 1),
      NODE_ENV: 'production'
    });
    return;
  }

  // Sobe canary usando o mesmo entrypoint em dist.
  const start = runCmd('pm2', ['start', 'dist/index.js', '--name', canaryName], {
    PORT: port,
    WS_PORT: String(Number(port) + 1),
    NODE_ENV: 'production'
  });
  if (!start.ok) {
    // fallback: tentar npm start
    notifier.warn(`Falha ao iniciar canary via dist/index.js. Tentando via npm start. Detalhes: ${start.out.slice(0, 500)}`);
    runCmd('pm2', ['start', 'npm', '--name', canaryName, '--', 'start'], {
      PORT: port,
      WS_PORT: String(Number(port) + 1),
      NODE_ENV: 'production'
    });
  }

  notifier.info(`Canary iniciado em porta ${port} (main=${mainPort}).`);
}

function restartMain(cfg: AgentConfig): void {
  const appName = cfg.pm2?.appName || 'guriri';
  runCmd('pm2', ['restart', appName, '--update-env']);
}

export async function runAutopilotLoop(opts: { config: AgentConfig; notifier: Notifier; prod: boolean }): Promise<void> {
  const { config, notifier } = opts;

  const cache = readCache();
  const stateKey = 'autopilot';
  const state = (cache[stateKey] as any) || {};
  const intervalSeconds = config.autopilot?.intervalSeconds ?? 60;

  await notifier.info(`Autopilot ativo. interval=${intervalSeconds}s, dryRun=${String(config.dryRun)}.`);

  // Loop infinito
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const incident = getIncidentFromPm2Logs(config);
      if (!incident) {
        await sleep(intervalSeconds * 1000);
        continue;
      }

      const alreadySeen = state.lastFingerprint === incident.fingerprint;
      if (alreadySeen) {
        await sleep(intervalSeconds * 1000);
        continue;
      }

      state.lastFingerprint = incident.fingerprint;
      state.lastSeenAt = new Date().toISOString();
      state.attempts = 0;
      state.lastAction = 'detected';
      writeCache({ ...cache, [stateKey]: state });

      await notifier.warn('Incidente detectado nos logs do PM2. Tentando correção segura...');

      const maxAttempts = config.autopilot?.maxFixAttemptsPerIncident ?? 2;
      const baseline = snapshotHead();

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        state.attempts = attempt;
        writeCache({ ...cache, [stateKey]: state });

        ensureGitClean(Boolean(config.patch?.requireGitClean));

        if (config.dryRun) {
          await notifier.info('dryRun=true: não vou pedir patch nem aplicar mudanças.');
          break;
        }

        const prompt = buildContextForModel(config, incident, String(state.lastActionLog || ''));
        const patch = await askOpenAIForPatch(prompt);

        if (!patch || !looksLikeUnifiedDiff(patch)) {
          state.lastAction = 'no_patch';
          state.lastActionLog = `OpenAI retornou conteúdo inválido (não diff). Len=${patch?.length || 0}`;
          writeCache({ ...cache, [stateKey]: state });
          await notifier.warn('OpenAI não retornou um patch válido. Abortando este incidente.');
          break;
        }

        if (!withinPathPolicy(config, patch)) {
          state.lastAction = 'blocked_by_policy';
          state.lastActionLog = 'Patch tentou tocar em paths proibidos.';
          writeCache({ ...cache, [stateKey]: state });
          await notifier.warn('Patch bloqueado por policy (paths proibidos).');
          break;
        }

        const applied = applyUnifiedDiffPatch(patch, { maxBytes: config.patch?.maxPatchBytes ?? 256 * 1024 });
        if (!applied.applied) {
          state.lastAction = 'apply_failed';
          state.lastActionLog = applied.message;
          writeCache({ ...cache, [stateKey]: state });
          await notifier.warn(`Falha ao aplicar patch: ${applied.message.slice(0, 500)}`);
          rollbackTo(baseline);
          continue;
        }

        // Checks
        if (config.autopilot?.checks?.runBuild) {
          const b = runCmd('npm', ['run', 'build']);
          if (!b.ok) {
            state.lastAction = 'build_failed';
            state.lastActionLog = b.out.slice(0, 4000);
            writeCache({ ...cache, [stateKey]: state });
            await notifier.warn('Build falhou; fazendo rollback.');
            rollbackTo(baseline);
            continue;
          }
        }

        if (config.autopilot?.checks?.runTests) {
          const t = runCmd('npm', ['test']);
          if (!t.ok) {
            state.lastAction = 'tests_failed';
            state.lastActionLog = t.out.slice(0, 4000);
            writeCache({ ...cache, [stateKey]: state });
            await notifier.warn('Testes falharam; fazendo rollback.');
            rollbackTo(baseline);
            continue;
          }
        }

        // Canary + smoke
        ensureCanaryStarted(config, notifier);
        const canaryPort = config.ports?.canary ?? 5001;
        const smoke = await smokeHealth({
          port: canaryPort,
          path: config.autopilot?.smoke?.path || '/health',
          timeoutMs: config.autopilot?.smoke?.timeoutMs ?? 5000
        });

        if (!smoke.ok) {
          state.lastAction = 'smoke_failed';
          state.lastActionLog = smoke.message;
          writeCache({ ...cache, [stateKey]: state });
          await notifier.warn(`Smoke falhou no canary; rollback. (${smoke.message})`);
          rollbackTo(baseline);
          continue;
        }

        // Promote
        restartMain(config);
        state.lastAction = 'promoted';
        state.lastActionLog = `Patch aplicado e validado via canary. Smoke OK. Main reiniciado. baseline=${baseline}`;
        writeCache({ ...cache, [stateKey]: state });
        await notifier.info('Correção aplicada com sucesso (canary ok) e main reiniciado.');
        break;
      }
    } catch (err: any) {
      await notifier.error(`Autopilot erro: ${String(err?.message || err).slice(0, 800)}`);
    }

    await sleep((config.autopilot?.intervalSeconds ?? 60) * 1000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
