/**
 * UTILIDADE: Helpers para gerar senhas temporárias únicas e registrar credenciais em arquivos locais.
 * O objetivo é evitar hardcode de senhas nos scripts de importação e manter um log auditável fora do repositório.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Gera senhas aleatórias com entropia base64url e prefixo baseado no ID para facilitar identificação manual.
 */
export function generateSecurePassword(label: string) {
  const entropy = crypto.randomBytes(9).toString('base64url');
  const prefix = label.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toLowerCase() || 'usr';
  return `${prefix}-${entropy}`;
}

/**
 * Escreve as credenciais temporárias em um arquivo CSV dentro de .output/ para posterior distribuição.
 */
export class CredentialRecorder {
  private readonly lines: string[] = ['id,email,role,tempPassword'];
  private readonly filePath: string;

  constructor(prefix: string) {
    const outputDir = path.resolve(process.cwd(), '.output');
    fs.mkdirSync(outputDir, { recursive: true });
    this.filePath = path.join(outputDir, `${prefix}-${Date.now()}.csv`);
  }

  add(entry: { id: string; email: string; role: string; password: string }) {
    this.lines.push(`${entry.id},${entry.email},${entry.role},${entry.password}`);
  }

  finalize() {
    fs.writeFileSync(this.filePath, this.lines.join('\n'), { encoding: 'utf8' });
    return this.filePath;
  }
}
