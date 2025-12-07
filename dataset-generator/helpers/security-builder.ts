/**
 * Security Dataset Builder - 2.500 exemplos
 * Dataset Generator - Agent Zero v3.0
 */

import { RandomUtils } from './random-utils.js';

export interface SecurityExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

export class SecurityBuilder {
  private static readonly SYSTEM_PROMPT = `Você é a IA Hacker White Hat do Agent Zero v3.0, especialista em segurança ofensiva e defensiva.

Analise eventos de segurança e retorne SEMPRE em JSON válido com:
- tipo_incidente: string
- severidade: "baixa" | "media" | "alta" | "critica"
- descricao: string detalhada
- evidencias: array de strings
- acoes_recomendadas: array de objetos { acao, dados, prioridade }

Ações válidas: aplicar_rate_limit, bloquear_ip, notificar_time_seguranca, ativar_modo_degradado, marcar_dependencia_como_inconsistente, criar_pr_seguranca, recomendar_patch_codigo, registrar_incidente, validate_user_fingerprint, require_additional_verification, escalate_to_compliance, escalate_to_fraud.`;

  static generateDataset(): SecurityExample[] {
    const examples: SecurityExample[] = [];
    
    // 600 brute-force
    for (let i = 0; i < 600; i++) {
      examples.push(this.generateBruteForce());
    }
    
    // 400 credential-stuffing
    for (let i = 0; i < 400; i++) {
      examples.push(this.generateCredentialStuffing());
    }
    
    // 300 DDoS
    for (let i = 0; i < 300; i++) {
      examples.push(this.generateDDoS());
    }
    
    // 300 behavioral anomalies
    for (let i = 0; i < 300; i++) {
      examples.push(this.generateBehavioralAnomaly());
    }
    
    // 300 pattern deviation
    for (let i = 0; i < 300; i++) {
      examples.push(this.generatePatternDeviation());
    }
    
    // 200 dependency failures
    for (let i = 0; i < 200; i++) {
      examples.push(this.generateDependencyFailure());
    }
    
    // 200 negativos (sem ação)
    for (let i = 0; i < 200; i++) {
      examples.push(this.generateNegativeCase());
    }
    
    // 200 híbridos complexos
    for (let i = 0; i < 200; i++) {
      examples.push(this.generateComplexHybrid());
    }
    
    return examples;
  }

  private static generateBruteForce(): SecurityExample {
    const ip = RandomUtils.randomIP();
    const email = RandomUtils.randomEmail();
    const attempts = RandomUtils.randomInt(5, 50);
    const severidade = attempts > 20 ? 'critica' : attempts > 10 ? 'alta' : 'media';
    
    const event = {
      tipo: 'brute_force_detectado',
      origem: 'auth-analyzer',
      severidade,
      timestamp: new Date(RandomUtils.randomTimestamp()).toISOString(),
      dados: {
        ip,
        email,
        tentativas_falhadas: attempts,
        janela_tempo_minutos: 15,
        endpoint: '/api/login'
      }
    };

    const analysis = {
      tipo_incidente: 'brute_force_detectado',
      severidade,
      descricao: `Detectado ataque de força bruta: ${attempts} tentativas de login falhadas do IP ${ip} em 15 minutos visando ${email}.`,
      evidencias: [
        `IP ${ip} realizou ${attempts} tentativas de login`,
        `Email alvo: ${email}`,
        `Taxa de falha: 100%`,
        `Intervalo entre tentativas: ${Math.floor(900 / attempts)}s`
      ],
      acoes_recomendadas: [
        {
          acao: 'bloquear_ip',
          dados: {
            ips: [ip],
            duracao_minutos: attempts > 20 ? 1440 : 60,
            motivo: 'Brute force attack detected'
          },
          prioridade: 1
        },
        {
          acao: 'aplicar_rate_limit',
          dados: {
            endpoint: '/api/login',
            janela_segundos: 60,
            max_requisicoes: 5,
            por_ip: true
          },
          prioridade: 2
        },
        {
          acao: 'notificar_time_seguranca',
          dados: {
            canal: 'telegram',
            severidade,
            mensagem: `🚨 Brute force: ${attempts} tentativas de ${ip}`
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

  private static generateCredentialStuffing(): SecurityExample {
    const ip = RandomUtils.randomIP();
    const emails = RandomUtils.randomInt(10, 50);
    const attempts = RandomUtils.randomInt(15, 100);
    
    const event = {
      tipo: 'credential_stuffing',
      origem: 'auth-analyzer',
      severidade: 'critica',
      timestamp: new Date(RandomUtils.randomTimestamp()).toISOString(),
      dados: {
        ip,
        emails_unicos: emails,
        total_tentativas: attempts,
        janela_tempo_minutos: 5
      }
    };

    const analysis = {
      tipo_incidente: 'credential_stuffing',
      severidade: 'critica',
      descricao: `Credential stuffing detectado: ${attempts} tentativas com ${emails} emails diferentes do IP ${ip}.`,
      evidencias: [
        `${emails} emails únicos testados`,
        `${attempts} tentativas em 5 minutos`,
        `IP origem: ${ip}`,
        `Padrão de ataque automatizado detectado`
      ],
      acoes_recomendadas: [
        {
          acao: 'bloquear_ip',
          dados: {
            ips: [ip],
            duracao_minutos: 2880,
            motivo: 'Credential stuffing attack'
          },
          prioridade: 1
        },
        {
          acao: 'require_additional_verification',
          dados: {
            metodo: '2fa',
            duracao_horas: 24
          },
          prioridade: 2
        },
        {
          acao: 'escalate_to_compliance',
          dados: {
            motivo: 'Possível vazamento de credenciais',
            impacto_usuarios: emails
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

  private static generateDDoS(): SecurityExample {
    const rpm = RandomUtils.randomInt(500, 5000);
    const baseline = RandomUtils.randomInt(50, 200);
    const multiplier = Math.floor(rpm / baseline);
    const severidade = multiplier > 10 ? 'critica' : 'alta';
    
    const event = {
      tipo: 'ddos_pattern',
      origem: 'traffic-analyzer',
      severidade,
      timestamp: new Date(RandomUtils.randomTimestamp()).toISOString(),
      dados: {
        rpm_atual: rpm,
        rpm_baseline: baseline,
        multiplicador: multiplier,
        ips_distintos: RandomUtils.randomInt(100, 500)
      }
    };

    const analysis = {
      tipo_incidente: 'ddos_pattern',
      severidade,
      descricao: `Spike de tráfego detectado: ${rpm} RPM (${multiplier}x baseline normal de ${baseline} RPM).`,
      evidencias: [
        `Taxa atual: ${rpm} req/min`,
        `Baseline: ${baseline} req/min`,
        `Multiplicador: ${multiplier}x`,
        `IPs distintos: ${event.dados.ips_distintos}`
      ],
      acoes_recomendadas: [
        {
          acao: 'aplicar_rate_limit',
          dados: {
            endpoint: '/*',
            janela_segundos: 60,
            max_requisicoes: Math.floor(baseline / 10),
            por_ip: true
          },
          prioridade: 1
        },
        {
          acao: 'ativar_modo_degradado',
          dados: {
            funcionalidades_desabilitar: ['analytics', 'recommendations'],
            duracao_minutos: 30,
            mensagem_usuario: 'Modo de proteção ativo'
          },
          prioridade: 2
        },
        {
          acao: 'notificar_time_seguranca',
          dados: {
            canal: 'slack',
            severidade,
            mensagem: `⚠️ Possível DDoS: ${rpm} RPM (${multiplier}x normal)`
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

  private static generateBehavioralAnomaly(): SecurityExample {
    const userId = RandomUtils.generateUserId();
    const riskScore = RandomUtils.randomInt(60, 95);
    const automationScore = RandomUtils.randomInt(70, 100);
    
    const event = {
      tipo: 'comportamento_suspeito',
      origem: 'behavior-analyzer',
      severidade: riskScore > 85 ? 'critica' : riskScore > 70 ? 'alta' : 'media',
      timestamp: new Date(RandomUtils.randomTimestamp()).toISOString(),
      dados: {
        user_id: userId,
        risk_score: riskScore,
        automation_score: automationScore,
        acoes_por_segundo: RandomUtils.randomInt(5, 20),
        fingerprint_mudancas: RandomUtils.randomInt(3, 10)
      }
    };

    const analysis = {
      tipo_incidente: 'comportamento_suspeito',
      severidade: event.severidade,
      descricao: `Comportamento anômalo detectado: usuário ${userId} com score de risco ${riskScore} e automação ${automationScore}.`,
      evidencias: [
        `Risk score: ${riskScore}/100`,
        `Automation score: ${automationScore}/100`,
        `${event.dados.acoes_por_segundo} ações/segundo`,
        `${event.dados.fingerprint_mudancas} mudanças de fingerprint`
      ],
      acoes_recomendadas: [
        {
          acao: 'validate_user_fingerprint',
          dados: {
            user_id: userId,
            required_match_threshold: 0.8
          },
          prioridade: 1
        },
        {
          acao: 'require_additional_verification',
          dados: {
            metodo: 'captcha',
            tipo: 'behavioral_anomaly'
          },
          prioridade: 2
        },
        {
          acao: 'registrar_incidente',
          dados: {
            categoria: 'suspicious_behavior',
            user_id: userId
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

  private static generatePatternDeviation(): SecurityExample {
    const metricType = RandomUtils.randomElement(['latencia', 'taxa_erro', 'trafego']);
    const deviationFactor = RandomUtils.randomInt(3, 10);
    
    const event = {
      tipo: `desvio_${metricType}`,
      origem: 'pattern-deviation-analyzer',
      severidade: deviationFactor > 7 ? 'alta' : 'media',
      timestamp: new Date(RandomUtils.randomTimestamp()).toISOString(),
      dados: {
        metrica: metricType,
        valor_atual: RandomUtils.randomInt(500, 2000),
        baseline: RandomUtils.randomInt(100, 300),
        fator_desvio: deviationFactor,
        janelas_afetadas: RandomUtils.randomInt(3, 8)
      }
    };

    const analysis = {
      tipo_incidente: `desvio_${metricType}`,
      severidade: event.severidade,
      descricao: `Desvio de padrão detectado em ${metricType}: ${deviationFactor}x acima do normal em múltiplas janelas temporais.`,
      evidencias: [
        `Métrica: ${metricType}`,
        `Valor atual: ${event.dados.valor_atual}`,
        `Baseline: ${event.dados.baseline}`,
        `Desvio: ${deviationFactor}x`,
        `${event.dados.janelas_afetadas} janelas afetadas`
      ],
      acoes_recomendadas: [
        {
          acao: 'aumentar_nivel_log',
          dados: {
            componente: metricType,
            nivel: 'debug',
            duracao_minutos: 30
          },
          prioridade: 1
        },
        {
          acao: 'executar_health_check',
          dados: {
            componentes: ['api', 'database', 'cache'],
            timeout_ms: 5000
          },
          prioridade: 2
        },
        {
          acao: 'notificar_time_seguranca',
          dados: {
            canal: 'email',
            severidade: event.severidade,
            mensagem: `Desvio em ${metricType}: ${deviationFactor}x`
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

  private static generateDependencyFailure(): SecurityExample {
    const dependency = RandomUtils.randomDependency();
    const service = RandomUtils.randomService();
    
    const event = {
      tipo: 'falha_dependencia_externa',
      origem: 'dependency-analyzer',
      severidade: 'alta',
      timestamp: new Date(RandomUtils.randomTimestamp()).toISOString(),
      dados: {
        dependencia: dependency,
        servico_afetado: service,
        taxa_falha: RandomUtils.randomInt(50, 100),
        duracao_minutos: RandomUtils.randomInt(5, 60)
      }
    };

    const analysis = {
      tipo_incidente: 'falha_dependencia_externa',
      severidade: 'alta',
      descricao: `Falha crítica na dependência ${dependency} afetando ${service} com ${event.dados.taxa_falha}% de falha.`,
      evidencias: [
        `Dependência: ${dependency}`,
        `Serviço afetado: ${service}`,
        `Taxa de falha: ${event.dados.taxa_falha}%`,
        `Duração: ${event.dados.duracao_minutos}min`
      ],
      acoes_recomendadas: [
        {
          acao: 'marcar_dependencia_como_inconsistente',
          dados: {
            dependencia: dependency,
            motivo: 'Alta taxa de falha detectada',
            duracao_horas: 24
          },
          prioridade: 1
        },
        {
          acao: 'ativar_fallback_provider',
          dados: {
            servico: service,
            temporario: true
          },
          prioridade: 2
        },
        {
          acao: 'criar_pr_seguranca',
          dados: {
            titulo: `Atualizar ${dependency} - falhas detectadas`,
            descricao: `Taxa de falha: ${event.dados.taxa_falha}%`
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

  private static generateNegativeCase(): SecurityExample {
    const event = {
      tipo: RandomUtils.randomElement(['spike_trafego_suspeito', 'erro_autenticacao_massa', 'latencia_excessiva']),
      origem: 'traffic-analyzer',
      severidade: 'baixa',
      timestamp: new Date(RandomUtils.randomTimestamp()).toISOString(),
      dados: {
        rpm_atual: RandomUtils.randomInt(50, 100),
        rpm_baseline: RandomUtils.randomInt(40, 90),
        motivo: 'Dentro dos limites normais'
      }
    };

    const analysis = {
      tipo_incidente: event.tipo,
      severidade: 'baixa',
      descricao: `Evento de ${event.tipo} detectado mas dentro dos limites aceitáveis. Nenhuma ação necessária.`,
      evidencias: [
        'Métricas dentro do range normal',
        'Sem padrões maliciosos detectados',
        'Baseline não excedido'
      ],
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

  private static generateComplexHybrid(): SecurityExample {
    const ip = RandomUtils.randomIP();
    const userId = RandomUtils.generateUserId();
    
    const event = {
      tipo: 'anomalia_multi_janela',
      origem: 'multi-analyzer',
      severidade: 'critica',
      timestamp: new Date(RandomUtils.randomTimestamp()).toISOString(),
      dados: {
        ip,
        user_id: userId,
        brute_force_attempts: RandomUtils.randomInt(10, 30),
        behavioral_risk: RandomUtils.randomInt(75, 95),
        traffic_spike: RandomUtils.randomInt(5, 15),
        credential_stuffing_indicators: true
      }
    };

    const analysis = {
      tipo_incidente: 'anomalia_multi_janela',
      severidade: 'critica',
      descricao: `Ataque híbrido detectado: combinação de brute force, behavioral anomaly e traffic spike do IP ${ip}.`,
      evidencias: [
        `Brute force: ${event.dados.brute_force_attempts} tentativas`,
        `Behavioral risk: ${event.dados.behavioral_risk}`,
        `Traffic spike: ${event.dados.traffic_spike}x`,
        'Indicadores de credential stuffing presentes'
      ],
      acoes_recomendadas: [
        {
          acao: 'bloquear_ip',
          dados: {
            ips: [ip],
            duracao_minutos: 4320,
            motivo: 'Hybrid attack detected'
          },
          prioridade: 1
        },
        {
          acao: 'validate_user_fingerprint',
          dados: {
            user_id: userId,
            required_match_threshold: 0.95
          },
          prioridade: 2
        },
        {
          acao: 'escalate_to_compliance',
          dados: {
            motivo: 'Ataque complexo detectado',
            severidade: 'critica'
          },
          prioridade: 3
        },
        {
          acao: 'escalate_to_fraud',
          dados: {
            suspeito_user_id: userId,
            ip
          },
          prioridade: 4
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
}
