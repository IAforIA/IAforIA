import { execFileSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

export type ApplyPatchResult = {
  applied: boolean;
  message: string;
};

export function applyUnifiedDiffPatch(patchText: string, opts?: { maxBytes?: number }): ApplyPatchResult {
  const maxBytes = opts?.maxBytes ?? 256 * 1024;
  const patchBytes = Buffer.byteLength(patchText, 'utf-8');
  if (patchBytes > maxBytes) {
    return { applied: false, message: `Patch muito grande (${patchBytes} bytes).` };
  }

  const patchPath = join(process.cwd(), '.agent', '.cache', `patch-${Date.now()}.diff`);
  writeFileSync(patchPath, patchText, 'utf-8');

  try {
    execFileSync('git', ['apply', '--whitespace=nowarn', patchPath], { stdio: 'pipe' });
    return { applied: true, message: 'Patch aplicado com git apply.' };
  } catch (err: any) {
    const msg = String(err?.stderr || err?.message || err);
    return { applied: false, message: `Falha ao aplicar patch: ${msg}` };
  }
}
