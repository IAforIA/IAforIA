/**
 * Dataset Generator - Agent Zero v3.0
 * Gera 10.000 exemplos de fine-tuning para todos os módulos
 * 
 * Distribuição:
 * - Security: 2.500 exemplos
 * - SRE: 2.500 exemplos
 * - Anti-Fraude: 2.500 exemplos
 * - Compliance: 2.500 exemplos
 * 
 * @author Agent Zero Team
 * @version 3.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { SecurityBuilder } from './helpers/security-builder.js';
import { SREBuilder } from './helpers/sre-builder.js';
import { AntiFraudBuilder } from './helpers/antifraud-builder.js';
import { ComplianceBuilder } from './helpers/compliance-builder.js';

const OUTPUT_DIR = path.join(process.cwd(), 'outputs');

// Garantir que o diretório de output existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Salva array de exemplos em arquivo JSONL
 */
function saveToJSONL(examples: any[], filename: string): void {
  const filePath = path.join(OUTPUT_DIR, filename);
  const jsonlContent = examples.map(ex => JSON.stringify(ex)).join('\n');
  
  fs.writeFileSync(filePath, jsonlContent, 'utf-8');
  console.log(`✅ Gerado: ${filename} (${examples.length} exemplos)`);
}

/**
 * Gera estatísticas do dataset
 */
function printStats(examples: any[], moduleName: string): void {
  const totalMessages = examples.reduce((acc, ex) => acc + ex.messages.length, 0);
  const avgMessagesPerExample = (totalMessages / examples.length).toFixed(2);
  
  console.log(`\n📊 ${moduleName}:`);
  console.log(`   - Total de exemplos: ${examples.length}`);
  console.log(`   - Total de mensagens: ${totalMessages}`);
  console.log(`   - Média de mensagens/exemplo: ${avgMessagesPerExample}`);
}

/**
 * Main - Gera todos os datasets
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║    🤖 DATASET GENERATOR - AGENT ZERO v3.0 🤖            ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  console.log('🚀 Iniciando geração de 10.000 exemplos...\n');

  const startTime = Date.now();

  // 1. Security Dataset (2.500)
  console.log('🛡️  Gerando Security Dataset...');
  const securityExamples = SecurityBuilder.generateDataset();
  saveToJSONL(securityExamples, 'security_2500.jsonl');
  printStats(securityExamples, 'Security Module');

  // 2. SRE Dataset (2.500)
  console.log('\n🔧 Gerando SRE Dataset...');
  const sreExamples = SREBuilder.generateDataset();
  saveToJSONL(sreExamples, 'sre_2500.jsonl');
  printStats(sreExamples, 'SRE Module');

  // 3. Anti-Fraude Dataset (2.500)
  console.log('\n🚨 Gerando Anti-Fraude Dataset...');
  const fraudExamples = AntiFraudBuilder.generateDataset();
  saveToJSONL(fraudExamples, 'antifraude_2500.jsonl');
  printStats(fraudExamples, 'Anti-Fraude Module');

  // 4. Compliance Dataset (2.500)
  console.log('\n⚖️  Gerando Compliance Dataset...');
  const complianceExamples = ComplianceBuilder.generateDataset();
  saveToJSONL(complianceExamples, 'compliance_2500.jsonl');
  printStats(complianceExamples, 'Compliance Module');

  // 5. Merge Full Dataset (10.000)
  console.log('\n📦 Mesclando dataset completo...');
  const fullDataset = [
    ...securityExamples,
    ...sreExamples,
    ...fraudExamples,
    ...complianceExamples
  ];
  
  // Shuffle para melhor distribuição
  for (let i = fullDataset.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fullDataset[i], fullDataset[j]] = [fullDataset[j], fullDataset[i]];
  }
  
  saveToJSONL(fullDataset, 'full_10000.jsonl');
  printStats(fullDataset, 'Full Dataset');

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║              ✅ GERAÇÃO COMPLETA! ✅                     ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n⏱️  Tempo total: ${duration}s`);
  console.log(`📁 Arquivos salvos em: ${OUTPUT_DIR}\n`);
  console.log('📊 RESUMO FINAL:');
  console.log('   ├── security_2500.jsonl');
  console.log('   ├── sre_2500.jsonl');
  console.log('   ├── antifraude_2500.jsonl');
  console.log('   ├── compliance_2500.jsonl');
  console.log('   └── full_10000.jsonl');
  console.log('\n🎯 Próximos passos:');
  console.log('   1. Validar os arquivos JSONL gerados');
  console.log('   2. Fazer upload para OpenAI Fine-tuning API');
  console.log('   3. Treinar modelos individuais ou conjunto completo');
  console.log('\n✨ Datasets prontos para fine-tuning!\n');
}

// Executar gerador
main().catch(console.error);
