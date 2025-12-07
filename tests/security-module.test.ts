/**
 * Testes do Security Module - Agent Zero IA Hacker White Hat
 * 
 * Execute com: npm run test:security
 */

import { SecurityAgent } from '../.agent/security/security-agent.js';
import { SecurityExecutor } from '../.agent/security/security-executor.js';
import { TrafficAnalyzer } from '../.agent/security/analyzers/traffic-analyzer.js';
import { AuthAnalyzer } from '../.agent/security/analyzers/auth-analyzer.js';
import { DependencyAnalyzer } from '../.agent/security/analyzers/dependency-analyzer.js';
import { securityEventBus } from '../.agent/security/events/security-event-bus.js';
import type { SecurityEvent } from '../.agent/security/security-schema.js';

// ============================================================================
// CONFIGURAÇÃO DE TESTE
// ============================================================================

const testConfig = {
  security: {
    enabled: true,
    model: 'gpt-4o-mini',
    autoExecute: false, // Não executar ações automaticamente em testes
    maxActionsPerIncident: 3,
    notifyOnSeverity: ['alta', 'critica']
  },
  openai: {
    model: 'gpt-4o-mini',
    temperature: 0.2
  }
};

// ============================================================================
// TESTE 1: BRUTE FORCE DETECTION
// ============================================================================

async function testBruteForceDetection(): Promise<void> {
  console.log('\n📋 TESTE 1: Detecção de Brute Force\n');
  console.log('='.repeat(60));

  const authAnalyzer = new AuthAnalyzer();
  let eventReceived = false;

  // Listener de eventos
  securityEventBus.on('security-event', (event: SecurityEvent) => {
    if (event.tipo === 'brute-force') {
      eventReceived = true;
      console.log('\n✅ Evento de brute force detectado:');
      console.log(`   IP: ${event.dados.ip}`);
      console.log(`   Tentativas: ${event.dados.tentativas_falhas}`);
      console.log(`   Severidade: ${event.severidade}\n`);
    }
  });

  // Simular 10 tentativas falhadas do mesmo IP
  console.log('\n🔄 Simulando 10 tentativas de login falhadas...\n');
  const attackIP = '192.168.1.100';
  
  for (let i = 0; i < 10; i++) {
    authAnalyzer.recordLoginAttempt(attackIP, 'admin@example.com', false);
    console.log(`   [${i + 1}/10] Tentativa falhada registrada`);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  if (eventReceived) {
    console.log('\n✅ TESTE PASSOU: Brute force detectado corretamente\n');
  } else {
    console.log('\n❌ TESTE FALHOU: Brute force não foi detectado\n');
  }

  console.log('='.repeat(60));
}

// ============================================================================
// TESTE 2: OPENAI FAILURE DETECTION
// ============================================================================

async function testOpenAIFailureDetection(): Promise<void> {
  console.log('\n📋 TESTE 2: Detecção de Falha OpenAI\n');
  console.log('='.repeat(60));

  const dependencyAnalyzer = new DependencyAnalyzer();
  let event403Received = false;
  let event429Received = false;

  securityEventBus.on('security-event', (event: SecurityEvent) => {
    if (event.tipo === 'autenticacao-falha' && event.dados.servico === 'openai') {
      event403Received = true;
      console.log('\n✅ Evento 403 (autenticação) detectado:');
      console.log(`   Serviço: ${event.dados.servico}`);
      console.log(`   Status: ${event.dados.status_code}`);
    }
    
    if (event.tipo === 'rate-limit-externo' && event.dados.servico === 'openai') {
      event429Received = true;
      console.log('\n✅ Evento 429 (rate limit) detectado:');
      console.log(`   Serviço: ${event.dados.servico}`);
      console.log(`   Status: ${event.dados.status_code}\n`);
    }
  });

  // Simular erro 403
  console.log('\n🔄 Simulando OpenAI 403 (autenticação falhou)...\n');
  const error403 = new Error('Project does not have access to model');
  (error403 as any).status = 403;
  dependencyAnalyzer.recordOpenAIFailure(error403, 403);

  await new Promise(resolve => setTimeout(resolve, 200));

  // Simular erro 429
  console.log('🔄 Simulando OpenAI 429 (rate limit)...\n');
  const error429 = new Error('Rate limit exceeded');
  (error429 as any).status = 429;
  dependencyAnalyzer.recordOpenAIFailure(error429, 429);

  await new Promise(resolve => setTimeout(resolve, 200));

  const passed = event403Received && event429Received;
  
  if (passed) {
    console.log('✅ TESTE PASSOU: Ambos os eventos detectados\n');
  } else {
    console.log('❌ TESTE FALHOU:');
    console.log(`   403 detectado: ${event403Received}`);
    console.log(`   429 detectado: ${event429Received}\n`);
  }

  console.log('='.repeat(60));
}

// ============================================================================
// TESTE 3: TRAFFIC SPIKE DETECTION
// ============================================================================

async function testTrafficSpikeDetection(): Promise<void> {
  console.log('\n📋 TESTE 3: Detecção de Spike de Tráfego\n');
  console.log('='.repeat(60));

  const trafficAnalyzer = new TrafficAnalyzer();
  let spikeDetected = false;

  securityEventBus.on('security-event', (event: SecurityEvent) => {
    if (event.tipo === 'ddos-tentativa') {
      spikeDetected = true;
      console.log('\n✅ Spike de tráfego detectado:');
      console.log(`   RPM atual: ${event.dados.rpm_atual}`);
      console.log(`   RPM baseline: ${event.dados.rpm_baseline}`);
      console.log(`   Multiplicador: ${event.dados.multiplicador.toFixed(2)}x\n`);
    }
  });

  console.log('\n🔄 Criando baseline normal (30 requisições)...\n');
  
  // Criar baseline normal
  const mockReq = { path: '/api/test', method: 'GET', ip: '127.0.0.1', headers: {} };
  const mockRes = { statusCode: 200 };
  
  for (let i = 0; i < 30; i++) {
    trafficAnalyzer.analyzeRequest(mockReq as any, mockRes as any, 50);
  }

  console.log('🔄 Simulando spike (200 requisições em 1 minuto)...\n');

  // Simular spike (>3x baseline)
  for (let i = 0; i < 200; i++) {
    trafficAnalyzer.analyzeRequest(mockReq as any, mockRes as any, 50);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  if (spikeDetected) {
    console.log('✅ TESTE PASSOU: Spike detectado corretamente\n');
  } else {
    console.log('❌ TESTE FALHOU: Spike não foi detectado\n');
  }

  console.log('='.repeat(60));
}

// ============================================================================
// TESTE 4: SECURITY EXECUTOR
// ============================================================================

async function testSecurityExecutor(): Promise<void> {
  console.log('\n📋 TESTE 4: Execução de Ações de Segurança\n');
  console.log('='.repeat(60));

  const executor = new SecurityExecutor(testConfig);

  // Teste 1: Rate Limit
  console.log('\n🔧 Testando ação: aplicar-rate-limit\n');
  const rateLimitResult = await executor.execute({
    acao: 'aplicar-rate-limit',
    parametros: {
      endpoint: '/api/test',
      limite_requisicoes: 10,
      janela_tempo: 60
    },
    motivo: 'Teste automatizado',
    segura: true,
    prioridade: 1
  });

  console.log(`   Resultado: ${rateLimitResult.success ? '✅' : '❌'} ${rateLimitResult.mensagem}\n`);

  // Teste 2: Block IP
  console.log('🔧 Testando ação: bloquear-ip-temporario\n');
  const blockIPResult = await executor.execute({
    acao: 'bloquear-ip-temporario',
    parametros: {
      ip: '192.168.1.100',
      duracao_minutos: 60,
      motivo: 'Brute force detectado'
    },
    motivo: 'Teste automatizado',
    segura: true,
    prioridade: 1
  });

  console.log(`   Resultado: ${blockIPResult.success ? '✅' : '❌'} ${blockIPResult.mensagem}\n`);

  // Teste 3: Ação não-segura (deve falhar)
  console.log('🔧 Testando ação NÃO-SEGURA (deve ser rejeitada)\n');
  const unsafeResult = await executor.execute({
    acao: 'bloquear-ip-temporario',
    parametros: { ip: '1.1.1.1', duracao_minutos: 9999 },
    motivo: 'Teste',
    segura: false, // Marcada como não-segura
    prioridade: 1
  });

  console.log(`   Resultado: ${!unsafeResult.success ? '✅' : '❌'} ${unsafeResult.mensagem}\n`);

  const allPassed = rateLimitResult.success && blockIPResult.success && !unsafeResult.success;

  if (allPassed) {
    console.log('✅ TESTE PASSOU: Executor funcionando corretamente\n');
  } else {
    console.log('❌ TESTE FALHOU: Problemas no executor\n');
  }

  console.log('='.repeat(60));
}

// ============================================================================
// TESTE 5: SECURITY AGENT (IA ANALYSIS)
// ============================================================================

async function testSecurityAgent(): Promise<void> {
  console.log('\n📋 TESTE 5: Análise com IA (Security Agent)\n');
  console.log('='.repeat(60));

  if (!process.env.OPENAI_API_KEY) {
    console.log('\n⚠️  TESTE PULADO: OPENAI_API_KEY não configurada\n');
    console.log('='.repeat(60));
    return;
  }

  const securityAgent = new SecurityAgent(testConfig);

  // Criar evento de teste
  const testEvent: SecurityEvent = {
    tipo: 'brute-force',
    origem: 'auth-analyzer',
    severidade: 'critica',
    timestamp: new Date(),
    dados: {
      ip: '192.168.1.100',
      tentativas_falhas: 15,
      janela_minutos: 15,
      emails_tentados: ['admin@test.com', 'root@test.com']
    },
    contexto: {
      user_agent: 'python-requests/2.28.0'
    }
  };

  console.log('\n🤖 Enviando evento para análise da IA...\n');
  console.log('Evento:', JSON.stringify(testEvent, null, 2));

  try {
    const analysis = await securityAgent.analyzeSecurityEvent(testEvent);

    console.log('\n📊 Análise recebida da IA:\n');
    console.log(`   Tipo Incidente: ${analysis.tipo_incidente}`);
    console.log(`   Severidade: ${analysis.severidade}`);
    console.log(`   Componentes: ${analysis.componentes_afetados.join(', ')}`);
    console.log(`   Ações Recomendadas: ${analysis.acoes_recomendadas.length}\n`);

    analysis.acoes_recomendadas.forEach((acao, idx) => {
      console.log(`   ${idx + 1}. ${acao.acao} (prioridade ${acao.prioridade}, segura: ${acao.segura})`);
    });

    const hasValidActions = analysis.acoes_recomendadas.length > 0;
    const allActionsSafe = analysis.acoes_recomendadas.every(a => a.segura === true);

    if (hasValidActions && allActionsSafe) {
      console.log('\n✅ TESTE PASSOU: IA forneceu análise válida e segura\n');
    } else {
      console.log('\n❌ TESTE FALHOU: Análise inválida ou insegura\n');
    }
  } catch (error: any) {
    console.log('\n❌ TESTE FALHOU: Erro na análise da IA\n');
    console.error('   Erro:', error.message);
  }

  console.log('='.repeat(60));
}

// ============================================================================
// EXECUTAR TODOS OS TESTES
// ============================================================================

async function runAllTests(): Promise<void> {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║      🛡️  AGENT ZERO - SECURITY MODULE TESTS  🛡️        ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    await testBruteForceDetection();
    await testOpenAIFailureDetection();
    await testTrafficSpikeDetection();
    await testSecurityExecutor();
    await testSecurityAgent();

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║                  ✅ TESTES CONCLUÍDOS                   ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('\n');
  } catch (error: any) {
    console.error('\n❌ ERRO CRÍTICO NOS TESTES:\n');
    console.error(error);
    process.exit(1);
  }
}

// Executar
runAllTests().catch(console.error);
