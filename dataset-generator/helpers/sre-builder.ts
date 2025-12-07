/**
 * SRE Dataset Builder - 2.500 exemplos
 * Dataset Generator - Agent Zero v3.0
 */

import { RandomUtils } from './random-utils.js';

export interface SREExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

export class SREBuilder {
  private static readonly SYSTEM_PROMPT = `Você é a IA SRE do Agent Zero v3.0, especialista em Site Reliability Engineering e auto-healing.

Analise incidentes de infraestrutura e retorne SEMPRE em JSON válido com:
- tipo_incidente: string
- severidade: "baixa" | "media" | "alta" | "critica"
- componente: string
- descricao: string detalhada
- impacto: string
- acoes_recomendadas: array de objetos { acao, dados, prioridade }

Ações válidas: restart_worker, clear_cache, adjust_timeout, enable_degraded_mode, reroute_requests, increase_connection_pool, force_garbage_collection, restart_service, switch_to_backup, throttle_endpoint, release_resources, escalate_to_security, escalate_to_compliance.`;

  static generateDataset(): SREExample[] {
    const examples: SREExample[] = [];
    
    // Distribuição dos 2.500 exemplos
    const distribution = [
      { type: 'memory_leak', count: 400 },
      { type: 'alto_consumo_cpu', count: 350 },
      { type: 'worker_crash', count: 300 },
      { type: 'deadlock_detectado', count: 250 },
      { type: 'latencia_critica', count: 300 },
      { type: 'database_connection_pool_esgotado', count: 250 },
      { type: 'dependencia_externa_falhou', count: 200 },
      { type: 'cache_corrompido', count: 150 },
      { type: 'disco_cheio', count: 100 },
      { type: 'timeout_excessivo', count: 100 },
      { type: 'negative', count: 100 }
    ];

    distribution.forEach(({ type, count }) => {
      for (let i = 0; i < count; i++) {
        examples.push(this.generateByType(type));
      }
    });

    return examples;
  }

  private static generateByType(type: string): SREExample {
    switch (type) {
      case 'memory_leak': return this.generateMemoryLeak();
      case 'alto_consumo_cpu': return this.generateHighCPU();
      case 'worker_crash': return this.generateWorkerCrash();
      case 'deadlock_detectado': return this.generateDeadlock();
      case 'latencia_critica': return this.generateHighLatency();
      case 'database_connection_pool_esgotado': return this.generatePoolExhausted();
      case 'dependencia_externa_falhou': return this.generateExternalFailure();
      case 'cache_corrompido': return this.generateCacheCorruption();
      case 'disco_cheio': return this.generateDiskFull();
      case 'timeout_excessivo': return this.generateTimeout();
      case 'negative': return this.generateNegativeCase();
      default: return this.generateMemoryLeak();
    }
  }

  private static generateMemoryLeak(): SREExample {
    const memoryMB = RandomUtils.randomInt(1500, 3500);
    const threshold = 1024;
    const growthRate = RandomUtils.randomInt(50, 200);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'memory_leak',
      severidade: memoryMB > 3000 ? 'critica' : memoryMB > 2000 ? 'alta' : 'media',
      componente: 'worker',
      dados: {
        memory_usage_mb: memoryMB,
        threshold_mb: threshold,
        growth_rate_mb_per_hour: growthRate,
        heap_size_mb: memoryMB * 0.8,
        worker_id: `worker_${RandomUtils.randomInt(1, 8)}`
      }
    };

    const analysis = {
      tipo_incidente: 'memory_leak',
      severidade: event.severidade,
      componente: 'worker',
      descricao: `Memory leak detectado: worker usando ${memoryMB}MB (threshold: ${threshold}MB), crescendo ${growthRate}MB/hora.`,
      impacto: `Worker ${event.dados.worker_id} consumindo recursos excessivos, risco de OOM crash.`,
      acoes_recomendadas: [
        {
          acao: 'force_garbage_collection',
          dados: {
            worker_id: event.dados.worker_id,
            aggressive: memoryMB > 3000
          },
          prioridade: 1
        },
        {
          acao: 'restart_worker',
          dados: {
            worker_id: event.dados.worker_id,
            force: memoryMB > 3000,
            reason: 'Memory leak detected'
          },
          prioridade: 2
        },
        {
          acao: 'log_diagnostic',
          dados: {
            nivel: 'debug',
            componente: 'memory',
            duracao_minutos: 30
          },
          prioridade: 3
        }
      ]
    };

    return {
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(event) },
        { role: 'assistant', content: JSON.stringify(analysis) }
      ]
    };
  }

  private static generateHighCPU(): SREExample {
    const cpuPercent = RandomUtils.randomInt(75, 100);
    const duration = RandomUtils.randomInt(5, 60);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'alto_consumo_cpu',
      severidade: cpuPercent > 95 ? 'critica' : cpuPercent > 85 ? 'alta' : 'media',
      componente: 'cpu',
      dados: {
        cpu_usage_percent: cpuPercent,
        threshold: 80,
        duration_minutes: duration,
        processes: RandomUtils.randomInt(50, 200)
      }
    };

    const analysis = {
      tipo_incidente: 'alto_consumo_cpu',
      severidade: event.severidade,
      componente: 'cpu',
      descricao: `CPU usage crítico: ${cpuPercent}% por ${duration} minutos (threshold: 80%).`,
      impacto: `Performance degradada, latência aumentada, risco de timeout.`,
      acoes_recomendadas: [
        {
          acao: 'throttle_endpoint',
          dados: {
            endpoints: ['/*'],
            reduction_percent: 30,
            duration_minutes: 15
          },
          prioridade: 1
        },
        {
          acao: 'enable_degraded_mode',
          dados: {
            features_disabled: ['analytics', 'background_jobs'],
            duration_minutes: 30
          },
          prioridade: 2
        },
        {
          acao: 'release_resources',
          dados: {
            cache_clear: true,
            connection_pool_reduce: true
          },
          prioridade: 3
        }
      ]
    };

    return {
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(event) },
        { role: 'assistant', content: JSON.stringify(analysis) }
      ]
    };
  }

  private static generateWorkerCrash(): SREExample {
    const workerId = `worker_${RandomUtils.randomInt(1, 8)}`;
    const crashCount = RandomUtils.randomInt(1, 5);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'worker_crash',
      severidade: crashCount > 3 ? 'critica' : 'alta',
      componente: 'worker',
      dados: {
        worker_id: workerId,
        crash_count: crashCount,
        exit_code: RandomUtils.randomElement([1, 137, 139, 143]),
        last_error: 'SIGSEGV',
        uptime_seconds: RandomUtils.randomInt(10, 300)
      }
    };

    const analysis = {
      tipo_incidente: 'worker_crash',
      severidade: event.severidade,
      componente: 'worker',
      descricao: `Worker ${workerId} crashed ${crashCount}x com exit code ${event.dados.exit_code}.`,
      impacto: `Perda de requisições, capacidade reduzida, possível instabilidade.`,
      acoes_recomendadas: [
        {
          acao: 'restart_worker',
          dados: {
            worker_id: workerId,
            force: true,
            reason: `Crash recovery (${crashCount}x)`
          },
          prioridade: 1
        },
        {
          acao: 'reroute_requests',
          dados: {
            from_worker: workerId,
            redistribute: true
          },
          prioridade: 2
        },
        {
          acao: 'log_diagnostic',
          dados: {
            nivel: 'error',
            componente: 'worker',
            include_core_dump: true
          },
          prioridade: 3
        }
      ]
    };

    return {
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(event) },
        { role: 'assistant', content: JSON.stringify(analysis) }
      ]
    };
  }

  private static generateDeadlock(): SREExample {
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'deadlock_detectado',
      severidade: 'critica',
      componente: 'database',
      dados: {
        blocked_queries: RandomUtils.randomInt(5, 30),
        duration_seconds: RandomUtils.randomInt(10, 300),
        tables_locked: ['orders', 'payments', 'users'],
        transaction_ids: Array.from({ length: 3 }, (_, i) => `txn_${1000 + i}`)
      }
    };

    const analysis = {
      tipo_incidente: 'deadlock_detectado',
      severidade: 'critica',
      componente: 'database',
      descricao: `Deadlock detectado: ${event.dados.blocked_queries} queries bloqueadas há ${event.dados.duration_seconds}s.`,
      impacto: `Transações travadas, timeout iminente, dados inconsistentes.`,
      acoes_recomendadas: [
        {
          acao: 'release_resources',
          dados: {
            kill_blocking_transactions: true,
            transaction_ids: event.dados.transaction_ids
          },
          prioridade: 1
        },
        {
          acao: 'restart_service',
          dados: {
            service: 'database_connection_manager',
            graceful: false
          },
          prioridade: 2
        },
        {
          acao: 'escalate_to_compliance',
          dados: {
            motivo: 'Possível inconsistência de dados',
            tabelas_afetadas: event.dados.tables_locked
          },
          prioridade: 3
        }
      ]
    };

    return {
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(event) },
        { role: 'assistant', content: JSON.stringify(analysis) }
      ]
    };
  }

  private static generateHighLatency(): SREExample {
    const latency = RandomUtils.randomInt(2000, 10000);
    const threshold = 500;
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'latencia_critica',
      severidade: latency > 5000 ? 'critica' : 'alta',
      componente: 'api',
      dados: {
        avg_latency_ms: latency,
        threshold_ms: threshold,
        p95_latency_ms: latency * 1.5,
        affected_endpoints: ['/api/orders', '/api/payments']
      }
    };

    const analysis = {
      tipo_incidente: 'latencia_critica',
      severidade: event.severidade,
      componente: 'api',
      descricao: `Latência crítica: ${latency}ms médio (threshold: ${threshold}ms).`,
      impacto: `User experience degradada, timeouts, possível perda de conversões.`,
      acoes_recomendadas: [
        {
          acao: 'adjust_timeout',
          dados: {
            component: 'api',
            new_timeout_ms: Math.min(latency * 2, 15000)
          },
          prioridade: 1
        },
        {
          acao: 'clear_cache',
          dados: {
            cache_type: 'redis',
            selective: false
          },
          prioridade: 2
        },
        {
          acao: 'throttle_endpoint',
          dados: {
            endpoints: event.dados.affected_endpoints,
            reduction_percent: 40
          },
          prioridade: 3
        }
      ]
    };

    return {
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(event) },
        { role: 'assistant', content: JSON.stringify(analysis) }
      ]
    };
  }

  private static generatePoolExhausted(): SREExample {
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'database_connection_pool_esgotado',
      severidade: 'critica',
      componente: 'database',
      dados: {
        pool_size: 20,
        active_connections: 20,
        waiting_queries: RandomUtils.randomInt(50, 200),
        avg_wait_time_ms: RandomUtils.randomInt(1000, 5000)
      }
    };

    const analysis = {
      tipo_incidente: 'database_connection_pool_esgotado',
      severidade: 'critica',
      componente: 'database',
      descricao: `Connection pool esgotado: ${event.dados.waiting_queries} queries aguardando conexão.`,
      impacto: `Queries bloqueadas, timeouts, degradação severa de performance.`,
      acoes_recomendadas: [
        {
          acao: 'increase_connection_pool',
          dados: {
            from_size: event.dados.pool_size,
            to_size: event.dados.pool_size + 10,
            temporary: true
          },
          prioridade: 1
        },
        {
          acao: 'release_resources',
          dados: {
            close_idle_connections: true,
            max_idle_time_seconds: 30
          },
          prioridade: 2
        },
        {
          acao: 'throttle_endpoint',
          dados: {
            endpoints: ['/*'],
            reduction_percent: 30
          },
          prioridade: 3
        }
      ]
    };

    return {
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(event) },
        { role: 'assistant', content: JSON.stringify(analysis) }
      ]
    };
  }

  private static generateExternalFailure(): SREExample {
    const service = RandomUtils.randomService();
    const failureRate = RandomUtils.randomInt(50, 100);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'dependencia_externa_falhou',
      severidade: failureRate > 80 ? 'critica' : 'alta',
      componente: 'external_service',
      dados: {
        service_name: service,
        failure_rate_percent: failureRate,
        duration_minutes: RandomUtils.randomInt(5, 60),
        error_code: RandomUtils.randomElement([500, 502, 503, 504])
      }
    };

    const analysis = {
      tipo_incidente: 'dependencia_externa_falhou',
      severidade: event.severidade,
      componente: 'external_service',
      descricao: `Serviço externo ${service} com ${failureRate}% de falha.`,
      impacto: `Features dependentes indisponíveis, fallback necessário.`,
      acoes_recomendadas: [
        {
          acao: 'switch_to_backup',
          dados: {
            service: service,
            backup_provider: 'secondary'
          },
          prioridade: 1
        },
        {
          acao: 'enable_degraded_mode',
          dados: {
            features_disabled: [service],
            duration_minutes: 60
          },
          prioridade: 2
        },
        {
          acao: 'escalate_to_security',
          dados: {
            motivo: 'External dependency failure',
            service
          },
          prioridade: 3
        }
      ]
    };

    return {
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(event) },
        { role: 'assistant', content: JSON.stringify(analysis) }
      ]
    };
  }

  private static generateCacheCorruption(): SREExample {
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'cache_corrompido',
      severidade: 'alta',
      componente: 'cache',
      dados: {
        cache_type: 'redis',
        corrupted_keys: RandomUtils.randomInt(100, 5000),
        total_keys: RandomUtils.randomInt(10000, 50000),
        corruption_percent: RandomUtils.randomInt(1, 50)
      }
    };

    const analysis = {
      tipo_incidente: 'cache_corrompido',
      severidade: 'alta',
      componente: 'cache',
      descricao: `Cache corrompido: ${event.dados.corrupted_keys} keys (${event.dados.corruption_percent}%).`,
      impacto: `Dados inconsistentes, performance degradada, possível cache miss cascade.`,
      acoes_recomendadas: [
        {
          acao: 'clear_cache',
          dados: {
            cache_type: 'redis',
            selective: false
          },
          prioridade: 1
        },
        {
          acao: 'revalidate_schema',
          dados: {
            component: 'cache',
            full_rebuild: true
          },
          prioridade: 2
        },
        {
          acao: 'log_diagnostic',
          dados: {
            nivel: 'error',
            componente: 'cache',
            dump_state: true
          },
          prioridade: 3
        }
      ]
    };

    return {
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(event) },
        { role: 'assistant', content: JSON.stringify(analysis) }
      ]
    };
  }

  private static generateDiskFull(): SREExample {
    const usage = RandomUtils.randomInt(85, 100);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'disco_cheio',
      severidade: usage > 95 ? 'critica' : 'alta',
      componente: 'storage',
      dados: {
        disk_usage_percent: usage,
        threshold: 85,
        available_gb: RandomUtils.randomInt(1, 10),
        path: '/var/log'
      }
    };

    const analysis = {
      tipo_incidente: 'disco_cheio',
      severidade: event.severidade,
      componente: 'storage',
      descricao: `Disco ${usage}% cheio, apenas ${event.dados.available_gb}GB disponíveis.`,
      impacto: `Falha em escrita de logs, risco de crash, impossibilidade de salvar dados.`,
      acoes_recomendadas: [
        {
          acao: 'release_resources',
          dados: {
            clear_old_logs: true,
            days_to_keep: 7,
            compress_logs: true
          },
          prioridade: 1
        },
        {
          acao: 'log_diagnostic',
          dados: {
            nivel: 'warn',
            componente: 'storage',
            reduce_verbosity: true
          },
          prioridade: 2
        }
      ]
    };

    return {
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(event) },
        { role: 'assistant', content: JSON.stringify(analysis) }
      ]
    };
  }

  private static generateTimeout(): SREExample {
    const timeout = RandomUtils.randomInt(5000, 30000);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'timeout_excessivo',
      severidade: 'media',
      componente: 'api',
      dados: {
        current_timeout_ms: timeout,
        recommended_timeout_ms: 5000,
        timeout_count: RandomUtils.randomInt(10, 100),
        endpoint: RandomUtils.randomEndpoint()
      }
    };

    const analysis = {
      tipo_incidente: 'timeout_excessivo',
      severidade: 'media',
      componente: 'api',
      descricao: `Timeout excessivo: ${timeout}ms em ${event.dados.endpoint}.`,
      impacto: `Requisições lentas, user experience prejudicada.`,
      acoes_recomendadas: [
        {
          acao: 'adjust_timeout',
          dados: {
            component: 'api',
            new_timeout_ms: event.dados.recommended_timeout_ms
          },
          prioridade: 1
        }
      ]
    };

    return {
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(event) },
        { role: 'assistant', content: JSON.stringify(analysis) }
      ]
    };
  }

  private static generateNegativeCase(): SREExample {
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: RandomUtils.randomElement(['alto_consumo_cpu', 'latencia_critica', 'alto_consumo_memoria']),
      severidade: 'baixa',
      componente: 'api',
      dados: {
        metric_value: RandomUtils.randomInt(30, 60),
        threshold: 80,
        status: 'normal'
      }
    };

    const analysis = {
      tipo_incidente: event.tipo,
      severidade: 'baixa',
      componente: event.componente,
      descricao: `Métrica ${event.tipo} em níveis normais (${event.dados.metric_value}% < ${event.dados.threshold}% threshold).`,
      impacto: `Nenhum impacto detectado.`,
      acoes_recomendadas: []
    };

    return {
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(event) },
        { role: 'assistant', content: JSON.stringify(analysis) }
      ]
    };
  }
}
