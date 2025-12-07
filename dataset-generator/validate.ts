/**
 * Validation Script - Testa se todos os módulos compilam
 */

import { RandomUtils } from './helpers/random-utils.js';
import { SecurityBuilder } from './helpers/security-builder.js';
import { SREBuilder } from './helpers/sre-builder.js';
import { AntiFraudBuilder } from './helpers/antifraud-builder.js';
import { ComplianceBuilder } from './helpers/compliance-builder.js';

console.log('🧪 Testando módulos do dataset generator...\n');

// Test 1: Random Utils
console.log('✅ RandomUtils importado');
const testIP = RandomUtils.randomIP();
console.log(`   - IP aleatório: ${testIP}`);

// Test 2: Security Builder
console.log('✅ SecurityBuilder importado');
const securitySample = SecurityBuilder.generateDataset().slice(0, 1);
console.log(`   - Exemplo gerado: ${securitySample[0].messages[0].role}`);

// Test 3: SRE Builder
console.log('✅ SREBuilder importado');
const sreSample = SREBuilder.generateDataset().slice(0, 1);
console.log(`   - Exemplo gerado: ${sreSample[0].messages[0].role}`);

// Test 4: AntiFraud Builder
console.log('✅ AntiFraudBuilder importado');
const fraudSample = AntiFraudBuilder.generateDataset().slice(0, 1);
console.log(`   - Exemplo gerado: ${fraudSample[0].messages[0].role}`);

// Test 5: Compliance Builder
console.log('✅ ComplianceBuilder importado');
const complianceSample = ComplianceBuilder.generateDataset().slice(0, 1);
console.log(`   - Exemplo gerado: ${complianceSample[0].messages[0].role}`);

console.log('\n✨ Todos os módulos funcionando! Pronto para gerar datasets.\n');
