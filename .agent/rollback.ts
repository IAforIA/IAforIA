import { execFileSync } from 'child_process';

export function rollbackHard(): void {
  execFileSync('git', ['reset', '--hard'], { stdio: 'inherit' });
}

export function rollbackTo(ref: string): void {
  execFileSync('git', ['reset', '--hard', ref], { stdio: 'inherit' });
}
