/**
 * SCRIPT: backfill-client-address.ts
 * ETAPA: 04 do MANUAL-IMPLEMENTACAO
 * OBJETIVO: Preencher os novos campos de endereço/documento dos clientes
 *           usando a planilha/CRM legado antes de travar as validações.
 *
 * Como usar:
 * 1. Exporte a planilha legado (ou consuma a API) contendo: id, documentType,
 *    documentNumber, cep, rua, numero, bairro, complemento, referencia.
 * 2. Ajuste a função `loadLegacyData` para ler o arquivo correto (CSV/JSON/etc).
 * 3. Execute `npx tsx server/scripts/backfill-client-address.ts` com DATABASE_URL
 *    apontando para o Neon.
 * 4. Revise o relatório final antes de avançar para as próximas etapas.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { clients } from '../../shared/schema';
import { eq } from 'drizzle-orm';

interface LegacyClientRow {
  id: string;
  documentType: 'PF' | 'PJ';
  documentNumber: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  complemento?: string;
  referencia?: string;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL não definido. Configure antes de rodar o backfill.');
}

const sql = neon(connectionString);
const db = drizzle(sql);

async function loadLegacyData(): Promise<LegacyClientRow[]> {
  // TODO: Trocar esta simulação pela leitura real (CSV/planilha/API).
  // Comentário educativo: manter o mock facilita localmente e deixa claro
  // quais campos o operador precisa preencher.
  return [
    {
      id: 'cliente_demo',
      documentType: 'PJ',
      documentNumber: '00.000.000/0000-00',
      cep: '29000-000',
      rua: 'Rua Exemplo',
      numero: '100',
      bairro: 'Centro',
      complemento: 'Sala 10',
      referencia: 'Próximo à praça'
    }
  ];
}

async function main() {
  const legacyRows = await loadLegacyData();
  const report: { updated: number; skipped: string[] } = { updated: 0, skipped: [] };

  for (const row of legacyRows) {
    if (!row.id) {
      report.skipped.push('linha sem ID pronto para backfill');
      continue;
    }

    await db
      .update(clients)
      .set({
        documentType: row.documentType,
        documentNumber: row.documentNumber,
        cep: row.cep,
        rua: row.rua,
        numero: row.numero,
        bairro: row.bairro,
        complemento: row.complemento,
        referencia: row.referencia,
      })
      .where(eq(clients.id, row.id));

    report.updated += 1;
  }

  console.info('Backfill concluído', report);
  console.info('IMPORTANTE: remova o mock em loadLegacyData antes de usar em produção.');
}

main().catch((err) => {
  console.error('Falha ao executar backfill', err);
  process.exitCode = 1;
});
