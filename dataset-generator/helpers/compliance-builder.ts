/**
 * Compliance Dataset Builder - 2.500 exemplos
 * Dataset Generator - Agent Zero v3.0
 */

import { RandomUtils } from './random-utils.js';

export interface ComplianceExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

export class ComplianceBuilder {
  private static readonly SYSTEM_PROMPT = `Você é a IA de Compliance do Agent Zero v3.0, especialista em ética, privacidade e conformidade.

Analise eventos e retorne SEMPRE em JSON válido com:
- tipo_violacao: string
- severidade: "baixa" | "media" | "alta" | "critica"
- modulo_origem: string
- descricao: string detalhada
- impacto_usuario: boolean
- reversivel: boolean
- acoes_recomendadas: array de objetos { acao, dados, prioridade, requires_human }

Ações válidas: auditar_log, reverter_decisao, solicitar_aprovacao_humana, bloquear_acao_ai, registrar_violacao, alertar_administrador, arquivar_evidencia, notificar_dpo, escalar_para_legal.`;

  static generateDataset(): ComplianceExample[] {
    const examples: ComplianceExample[] = [];
    
    const distribution = [
      { type: 'acesso_nao_autorizado', count: 500 },
      { type: 'privacidade_usuario', count: 450 },
      { type: 'decisao_nao_etica', count: 400 },
      { type: 'excesso_autoridade', count: 350 },
      { type: 'patch_automatico_inseguro', count: 300 },
      { type: 'log_sensivel_exposto', count: 250 },
      { type: 'dados_nao_anonimizados', count: 150 },
      { type: 'negative', count: 100 }
    ];

    distribution.forEach(({ type, count }) => {
      for (let i = 0; i < count; i++) {
        examples.push(this.generateByType(type));
      }
    });

    return examples;
  }

  private static generateByType(type: string): ComplianceExample {
    switch (type) {
      case 'acesso_nao_autorizado': return this.generateUnauthorizedAccess();
      case 'privacidade_usuario': return this.generatePrivacyViolation();
      case 'decisao_nao_etica': return this.generateUnethicalDecision();
      case 'excesso_autoridade': return this.generateExcessAuthority();
      case 'patch_automatico_inseguro': return this.generateUnsafePatch();
      case 'log_sensivel_exposto': return this.generateSensitiveLogExposure();
      case 'dados_nao_anonimizados': return this.generateUnanonymizedData();
      case 'negative': return this.generateNegativeCase();
      default: return this.generateUnauthorizedAccess();
    }
  }

  private static generateUnauthorizedAccess(): ComplianceExample {
    const module = RandomUtils.randomElement(['security', 'sre', 'fraud', 'agent-zero']);
    const action = RandomUtils.randomElement(['deploy_to_vps', 'modify_pm2', 'restart_nginx', 'access_root']);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'acesso_nao_autorizado',
      severidade: 'critica',
      modulo_origem: module,
      descricao: `Módulo ${module} tentou executar ação proibida: ${action}`,
      evidencias: {
        module,
        attempted_action: action,
        blocked: true,
        vps_access_attempt: action.includes('vps') || action.includes('pm2') || action.includes('nginx')
      },
      impacto_usuario: false,
      reversivel: false
    };

    const analysis = {
      tipo_violacao: 'acesso_nao_autorizado',
      severidade: 'critica',
      modulo_origem: module,
      descricao: `VIOLAÇÃO CRÍTICA: Módulo ${module} tentou ${action} - ação bloqueada pelo sistema de compliance.`,
      impacto_usuario: false,
      reversivel: false,
      acoes_recomendadas: [
        {
          acao: 'bloquear_acao_ai',
          dados: {
            module,
            action,
            permanent: true
          },
          prioridade: 1,
          requires_human: false
        },
        {
          acao: 'registrar_violacao',
          dados: {
            tipo: 'unauthorized_vps_access',
            severidade: 'critica',
            module
          },
          prioridade: 2,
          requires_human: false
        },
        {
          acao: 'alertar_administrador',
          dados: {
            urgencia: 'critica',
            mensagem: `${module} tentou acessar VPS - BLOQUEADO`
          },
          prioridade: 3,
          requires_human: false
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

  private static generatePrivacyViolation(): ComplianceExample {
    const module = RandomUtils.randomElement(['security', 'fraud', 'ceo']);
    const dataType = RandomUtils.randomElement(['cpf', 'email', 'phone', 'address', 'payment_info']);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'privacidade_usuario',
      severidade: 'alta',
      modulo_origem: module,
      descricao: `Exposição de dados sensíveis: ${dataType}`,
      evidencias: {
        data_type: dataType,
        users_affected: RandomUtils.randomInt(1, 100),
        logged_without_encryption: true,
        gdpr_violation: true
      },
      impacto_usuario: true,
      reversivel: true
    };

    const analysis = {
      tipo_violacao: 'privacidade_usuario',
      severidade: 'alta',
      modulo_origem: module,
      descricao: `Violação de privacidade: dados ${dataType} de ${event.evidencias.users_affected} usuários expostos sem criptografia.`,
      impacto_usuario: true,
      reversivel: true,
      acoes_recomendadas: [
        {
          acao: 'auditar_log',
          dados: {
            scope: 'all_logs',
            search_pattern: dataType,
            sanitize: true
          },
          prioridade: 1,
          requires_human: false
        },
        {
          acao: 'notificar_dpo',
          dados: {
            violacao: 'privacy_breach',
            usuarios_afetados: event.evidencias.users_affected,
            tipo_dado: dataType
          },
          prioridade: 2,
          requires_human: true
        },
        {
          acao: 'arquivar_evidencia',
          dados: {
            tipo: 'privacy_violation',
            compliance_report: true
          },
          prioridade: 3,
          requires_human: false
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

  private static generateUnethicalDecision(): ComplianceExample {
    const module = 'ceo';
    const decision = RandomUtils.randomElement(['block_user_without_reason', 'modify_prices_unfairly', 'discriminate_customer']);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'decisao_nao_etica',
      severidade: 'alta',
      modulo_origem: module,
      descricao: `Decisão não ética detectada: ${decision}`,
      evidencias: {
        decision,
        ai_module: module,
        lacks_justification: true,
        potential_bias: true
      },
      impacto_usuario: true,
      reversivel: true
    };

    const analysis = {
      tipo_violacao: 'decisao_nao_etica',
      severidade: 'alta',
      modulo_origem: module,
      descricao: `Decisão antiética detectada: ${decision} sem justificativa adequada.`,
      impacto_usuario: true,
      reversivel: true,
      acoes_recomendadas: [
        {
          acao: 'reverter_decisao',
          dados: {
            decision_id: RandomUtils.generateTransactionId(),
            motivo: 'Decisão não ética'
          },
          prioridade: 1,
          requires_human: true
        },
        {
          acao: 'solicitar_aprovacao_humana',
          dados: {
            decisao: decision,
            module,
            urgencia: 'alta'
          },
          prioridade: 2,
          requires_human: true
        },
        {
          acao: 'registrar_violacao',
          dados: {
            tipo: 'unethical_decision',
            ai_module: module
          },
          prioridade: 3,
          requires_human: false
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

  private static generateExcessAuthority(): ComplianceExample {
    const module = RandomUtils.randomElement(['security', 'sre']);
    const action = RandomUtils.randomElement(['delete_all_data', 'shutdown_production', 'modify_billing']);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'excesso_autoridade',
      severidade: 'critica',
      modulo_origem: module,
      descricao: `Módulo ${module} tentou ${action} sem autorização`,
      evidencias: {
        module,
        action,
        requires_human_approval: true,
        potential_damage: 'high'
      },
      impacto_usuario: true,
      reversivel: false
    };

    const analysis = {
      tipo_violacao: 'excesso_autoridade',
      severidade: 'critica',
      modulo_origem: module,
      descricao: `Excesso de autoridade: ${module} tentou ${action} - requer aprovação humana.`,
      impacto_usuario: true,
      reversivel: false,
      acoes_recomendadas: [
        {
          acao: 'bloquear_acao_ai',
          dados: {
            module,
            action,
            permanent: false
          },
          prioridade: 1,
          requires_human: false
        },
        {
          acao: 'solicitar_aprovacao_humana',
          dados: {
            acao: action,
            module,
            urgencia: 'critica'
          },
          prioridade: 2,
          requires_human: true
        },
        {
          acao: 'escalar_para_legal',
          dados: {
            motivo: 'Excess authority attempt',
            severidade: 'critica'
          },
          prioridade: 3,
          requires_human: true
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

  private static generateUnsafePatch(): ComplianceExample {
    const dependency = RandomUtils.randomDependency();
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'patch_automatico_inseguro',
      severidade: 'alta',
      modulo_origem: 'security',
      descricao: `Patch automático sem testes: ${dependency}`,
      evidencias: {
        dependency,
        no_tests_run: true,
        breaking_changes_possible: true,
        production_environment: true
      },
      impacto_usuario: true,
      reversivel: true
    };

    const analysis = {
      tipo_violacao: 'patch_automatico_inseguro',
      severidade: 'alta',
      modulo_origem: 'security',
      descricao: `Patch inseguro: tentativa de atualizar ${dependency} em produção sem testes.`,
      impacto_usuario: true,
      reversivel: true,
      acoes_recomendadas: [
        {
          acao: 'bloquear_acao_ai',
          dados: {
            module: 'security',
            action: 'auto_patch',
            temporary: true
          },
          prioridade: 1,
          requires_human: false
        },
        {
          acao: 'solicitar_aprovacao_humana',
          dados: {
            acao: `Atualizar ${dependency}`,
            testes_necessarios: true
          },
          prioridade: 2,
          requires_human: true
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

  private static generateSensitiveLogExposure(): ComplianceExample {
    const sensitiveFields = RandomUtils.randomInt(5, 30);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'log_sensivel_exposto',
      severidade: 'media',
      modulo_origem: RandomUtils.randomElement(['security', 'sre', 'fraud']),
      descricao: 'Dados sensíveis em logs não criptografados',
      evidencias: {
        sensitive_fields_count: sensitiveFields,
        includes_pii: true,
        log_level: 'debug',
        public_accessible: false
      },
      impacto_usuario: true,
      reversivel: true
    };

    const analysis = {
      tipo_violacao: 'log_sensivel_exposto',
      severidade: 'media',
      modulo_origem: event.modulo_origem,
      descricao: `${sensitiveFields} campos sensíveis expostos em logs.`,
      impacto_usuario: true,
      reversivel: true,
      acoes_recomendadas: [
        {
          acao: 'auditar_log',
          dados: {
            sanitize_pii: true,
            redact_sensitive: true
          },
          prioridade: 1,
          requires_human: false
        },
        {
          acao: 'arquivar_evidencia',
          dados: {
            tipo: 'log_exposure',
            compliance_report: true
          },
          prioridade: 2,
          requires_human: false
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

  private static generateUnanonymizedData(): ComplianceExample {
    const recordCount = RandomUtils.randomInt(100, 10000);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'dados_nao_anonimizados',
      severidade: 'alta',
      modulo_origem: 'analytics',
      descricao: 'Dados de usuários não anonimizados em analytics',
      evidencias: {
        record_count: recordCount,
        contains_identifiers: true,
        gdpr_violation: true,
        export_detected: true
      },
      impacto_usuario: true,
      reversivel: true
    };

    const analysis = {
      tipo_violacao: 'dados_nao_anonimizados',
      severidade: 'alta',
      modulo_origem: 'analytics',
      descricao: `${recordCount} registros não anonimizados em sistema de analytics.`,
      impacto_usuario: true,
      reversivel: true,
      acoes_recomendadas: [
        {
          acao: 'bloquear_acao_ai',
          dados: {
            module: 'analytics',
            action: 'export_data',
            temporary: true
          },
          prioridade: 1,
          requires_human: false
        },
        {
          acao: 'notificar_dpo',
          dados: {
            violacao: 'unanonymized_data',
            record_count: recordCount
          },
          prioridade: 2,
          requires_human: true
        },
        {
          acao: 'solicitar_aprovacao_humana',
          dados: {
            acao: 'Anonimizar dados',
            urgencia: 'alta'
          },
          prioridade: 3,
          requires_human: true
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

  private static generateNegativeCase(): ComplianceExample {
    const module = RandomUtils.randomElement(['security', 'sre', 'fraud']);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: RandomUtils.randomElement(['privacidade_usuario', 'decisao_nao_etica', 'log_sensivel_exposto']),
      severidade: 'baixa',
      modulo_origem: module,
      descricao: 'Ação auditada e aprovada',
      evidencias: {
        compliant: true,
        human_approved: true,
        within_policy: true
      },
      impacto_usuario: false,
      reversivel: true
    };

    const analysis = {
      tipo_violacao: event.tipo,
      severidade: 'baixa',
      modulo_origem: module,
      descricao: 'Ação em conformidade com políticas. Nenhuma violação detectada.',
      impacto_usuario: false,
      reversivel: true,
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
