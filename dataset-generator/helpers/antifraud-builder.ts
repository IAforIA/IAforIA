/**
 * Anti-Fraud Dataset Builder - 2.500 exemplos
 * Dataset Generator - Agent Zero v3.0
 */

import { RandomUtils } from './random-utils.js';

export interface AntiFraudExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

export class AntiFraudBuilder {
  private static readonly SYSTEM_PROMPT = `Você é a IA Anti-Fraude do Agent Zero v3.0, especialista em detecção de fraudes financeiras e comportamentais.

Analise eventos suspeitos e retorne SEMPRE em JSON válido com:
- tipo_fraude: string
- severidade: "baixa" | "media" | "alta" | "critica"
- risk_score: number (0-100)
- confidence: number (0-1)
- descricao: string detalhada
- evidencias: array de strings
- acoes_recomendadas: array de objetos { acao, dados, prioridade, reversivel }

Ações válidas: bloquear_usuario_temporario, bloquear_usuario_permanente, exigir_verificacao_adicional, marcar_pedido_como_risco, alertar_ceo_ai, registrar_evidencia, congelar_transacao, solicitar_documento, escalar_para_compliance, notificar_autoridades.`;

  static generateDataset(): AntiFraudExample[] {
    const examples: AntiFraudExample[] = [];
    
    const distribution = [
      { type: 'chargeback_abusivo', count: 400 },
      { type: 'fraude_cartao', count: 400 },
      { type: 'conta_falsa', count: 350 },
      { type: 'multitentativas_suspeitas', count: 300 },
      { type: 'abuso_cupom', count: 250 },
      { type: 'pedido_duplicado', count: 200 },
      { type: 'manipulacao_localizacao', count: 200 },
      { type: 'estabelecimento_fraudando', count: 150 },
      { type: 'lavagem_dinheiro', count: 150 },
      { type: 'negative', count: 100 }
    ];

    distribution.forEach(({ type, count }) => {
      for (let i = 0; i < count; i++) {
        examples.push(this.generateByType(type));
      }
    });

    return examples;
  }

  private static generateByType(type: string): AntiFraudExample {
    switch (type) {
      case 'chargeback_abusivo': return this.generateChargeback();
      case 'fraude_cartao': return this.generateCardFraud();
      case 'conta_falsa': return this.generateFakeAccount();
      case 'multitentativas_suspeitas': return this.generateMultiAttempts();
      case 'abuso_cupom': return this.generateCouponAbuse();
      case 'pedido_duplicado': return this.generateDuplicateOrder();
      case 'manipulacao_localizacao': return this.generateLocationManipulation();
      case 'estabelecimento_fraudando': return this.generateMerchantFraud();
      case 'lavagem_dinheiro': return this.generateMoneyLaundering();
      case 'negative': return this.generateNegativeCase();
      default: return this.generateChargeback();
    }
  }

  private static generateChargeback(): AntiFraudExample {
    const userId = RandomUtils.generateUserId();
    const chargebackCount = RandomUtils.randomInt(3, 15);
    const totalValue = RandomUtils.randomInt(500, 5000);
    const riskScore = Math.min(chargebackCount * 10 + 40, 100);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'chargeback_abusivo',
      severidade: chargebackCount > 10 ? 'critica' : chargebackCount > 5 ? 'alta' : 'media',
      suspect_user_id: userId,
      suspect_ip: RandomUtils.randomIP(),
      dados: {
        chargeback_count: chargebackCount,
        total_value_brl: totalValue,
        period_days: 30,
        success_rate: RandomUtils.randomInt(0, 30),
        payment_methods: ['credit_card', 'pix']
      },
      evidencias: [
        `${chargebackCount} chargebacks em 30 dias`,
        `Valor total: R$ ${totalValue}`,
        `Taxa de sucesso: ${RandomUtils.randomInt(0, 30)}%`,
        'Padrão de abuso detectado'
      ],
      risk_score: riskScore
    };

    const analysis = {
      tipo_fraude: 'chargeback_abusivo',
      severidade: event.severidade,
      risk_score: riskScore,
      confidence: 0.85 + (chargebackCount / 100),
      descricao: `Usuário ${userId} com ${chargebackCount} chargebacks em 30 dias, totalizando R$ ${totalValue}. Padrão de abuso confirmado.`,
      evidencias: event.evidencias,
      acoes_recomendadas: [
        {
          acao: 'bloquear_usuario_permanente',
          dados: {
            user_id: userId,
            motivo: 'Chargeback abuse pattern',
            evidencias: event.evidencias
          },
          prioridade: 1,
          reversivel: false
        },
        {
          acao: 'registrar_evidencia',
          dados: {
            tipo: 'chargeback_abuse',
            user_id: userId,
            data: event.dados
          },
          prioridade: 2,
          reversivel: true
        },
        {
          acao: 'escalar_para_compliance',
          dados: {
            motivo: 'Possível fraude financeira',
            valor_total: totalValue
          },
          prioridade: 3,
          reversivel: true
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

  private static generateCardFraud(): AntiFraudExample {
    const userId = RandomUtils.generateUserId();
    const attempts = RandomUtils.randomInt(5, 20);
    const cardNumbers = RandomUtils.randomInt(3, 10);
    const riskScore = Math.min(attempts * 5 + 50, 100);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'fraude_cartao',
      severidade: 'critica',
      suspect_user_id: userId,
      suspect_ip: RandomUtils.randomIP(),
      dados: {
        failed_attempts: attempts,
        different_cards: cardNumbers,
        time_window_minutes: 10,
        bin_countries: ['BR', 'US', 'Unknown'],
        velocity_score: RandomUtils.randomInt(70, 100)
      },
      evidencias: [
        `${attempts} tentativas com ${cardNumbers} cartões diferentes`,
        'Cartões de múltiplos países',
        'Alta velocidade de tentativas',
        'BINs suspeitos detectados'
      ],
      risk_score: riskScore
    };

    const analysis = {
      tipo_fraude: 'fraude_cartao',
      severidade: 'critica',
      risk_score: riskScore,
      confidence: 0.92,
      descricao: `Fraude de cartão detectada: ${attempts} tentativas com ${cardNumbers} cartões em 10 minutos.`,
      evidencias: event.evidencias,
      acoes_recomendadas: [
        {
          acao: 'bloquear_usuario_temporario',
          dados: {
            user_id: userId,
            duracao_horas: 48,
            motivo: 'Card fraud detection'
          },
          prioridade: 1,
          reversivel: true
        },
        {
          acao: 'exigir_verificacao_adicional',
          dados: {
            user_id: userId,
            tipo: 'document_upload',
            urgencia: 'alta'
          },
          prioridade: 2,
          reversivel: true
        },
        {
          acao: 'notificar_autoridades',
          dados: {
            tipo_crime: 'card_fraud',
            evidencias: event.evidencias
          },
          prioridade: 3,
          reversivel: false
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

  private static generateFakeAccount(): AntiFraudExample {
    const userId = RandomUtils.generateUserId();
    const indicators = RandomUtils.randomInt(4, 8);
    const riskScore = indicators * 12;
    const similarAccounts = RandomUtils.randomInt(2, 8);
    const accountAgeHours = RandomUtils.randomInt(1, 24);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'conta_falsa',
      severidade: indicators > 6 ? 'alta' : 'media',
      suspect_user_id: userId,
      suspect_ip: RandomUtils.randomIP(),
      dados: {
        fraud_indicators: indicators,
        account_age_hours: accountAgeHours,
        email_disposable: true,
        phone_verified: false,
        document_validation: 'failed',
        similar_accounts: similarAccounts
      },
      evidencias: [
        'Email descartável detectado',
        'Telefone não verificado',
        'Documento inválido',
        `${similarAccounts} contas similares encontradas`,
        `Conta criada há ${accountAgeHours}h`
      ],
      risk_score: riskScore
    };

    const analysis = {
      tipo_fraude: 'conta_falsa',
      severidade: event.severidade,
      risk_score: riskScore,
      confidence: 0.88,
      descricao: `Conta falsa detectada: ${indicators} indicadores de fraude em conta criada há ${event.dados.account_age_hours}h.`,
      evidencias: event.evidencias,
      acoes_recomendadas: [
        {
          acao: 'solicitar_documento',
          dados: {
            user_id: userId,
            tipo_documento: ['cpf', 'selfie'],
            prazo_horas: 24
          },
          prioridade: 1,
          reversivel: true
        },
        {
          acao: 'marcar_pedido_como_risco',
          dados: {
            user_id: userId,
            nivel_risco: 'alto',
            revisao_manual: true
          },
          prioridade: 2,
          reversivel: true
        },
        {
          acao: 'registrar_evidencia',
          dados: {
            tipo: 'fake_account',
            user_id: userId,
            indicators: event.dados
          },
          prioridade: 3,
          reversivel: true
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

  private static generateMultiAttempts(): AntiFraudExample {
    const userId = RandomUtils.generateUserId();
    const attempts = RandomUtils.randomInt(10, 50);
    const success = RandomUtils.randomInt(0, 5);
    const riskScore = Math.min(attempts * 2, 100);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'multitentativas_suspeitas',
      severidade: attempts > 30 ? 'alta' : 'media',
      suspect_user_id: userId,
      suspect_ip: RandomUtils.randomIP(),
      dados: {
        total_attempts: attempts,
        successful: success,
        failed: attempts - success,
        time_window_minutes: 15,
        endpoints_hit: ['/api/payments', '/api/orders', '/api/cupons']
      },
      evidencias: [
        `${attempts} tentativas em 15 minutos`,
        `Taxa de sucesso: ${Math.floor((success/attempts)*100)}%`,
        'Padrão automatizado detectado',
        'Múltiplos endpoints atacados'
      ],
      risk_score: riskScore
    };

    const analysis = {
      tipo_fraude: 'multitentativas_suspeitas',
      severidade: event.severidade,
      risk_score: riskScore,
      confidence: 0.82,
      descricao: `${attempts} tentativas suspeitas em 15 minutos com apenas ${success} sucessos.`,
      evidencias: event.evidencias,
      acoes_recomendadas: [
        {
          acao: 'bloquear_usuario_temporario',
          dados: {
            user_id: userId,
            duracao_horas: 6,
            motivo: 'Suspicious activity pattern'
          },
          prioridade: 1,
          reversivel: true
        },
        {
          acao: 'exigir_verificacao_adicional',
          dados: {
            user_id: userId,
            tipo: 'captcha',
            urgencia: 'media'
          },
          prioridade: 2,
          reversivel: true
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

  private static generateCouponAbuse(): AntiFraudExample {
    const userId = RandomUtils.generateUserId();
    const couponsUsed = RandomUtils.randomInt(5, 30);
    const savingsValue = RandomUtils.randomInt(200, 2000);
    const riskScore = Math.min(couponsUsed * 3 + 40, 100);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'abuso_cupom',
      severidade: couponsUsed > 20 ? 'alta' : couponsUsed > 10 ? 'media' : 'baixa',
      suspect_user_id: userId,
      dados: {
        coupons_used: couponsUsed,
        total_discount_brl: savingsValue,
        period_days: 7,
        multiple_accounts_detected: true,
        same_address_count: RandomUtils.randomInt(3, 10)
      },
      evidencias: [
        `${couponsUsed} cupons usados em 7 dias`,
        `Desconto total: R$ ${savingsValue}`,
        'Múltiplas contas no mesmo endereço',
        'Padrão de farming detectado'
      ],
      risk_score: riskScore
    };

    const analysis = {
      tipo_fraude: 'abuso_cupom',
      severidade: event.severidade,
      risk_score: riskScore,
      confidence: 0.79,
      descricao: `Abuso de cupons: ${couponsUsed} cupons gerando R$ ${savingsValue} em descontos.`,
      evidencias: event.evidencias,
      acoes_recomendadas: [
        {
          acao: 'bloquear_usuario_temporario',
          dados: {
            user_id: userId,
            duracao_horas: 72,
            motivo: 'Coupon abuse'
          },
          prioridade: 1,
          reversivel: true
        },
        {
          acao: 'marcar_pedido_como_risco',
          dados: {
            user_id: userId,
            nivel_risco: 'medio',
            revisao_manual: true
          },
          prioridade: 2,
          reversivel: true
        },
        {
          acao: 'alertar_ceo_ai',
          dados: {
            tipo: 'coupon_abuse',
            impacto_financeiro: savingsValue
          },
          prioridade: 3,
          reversivel: true
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

  private static generateDuplicateOrder(): AntiFraudExample {
    const userId = RandomUtils.generateUserId();
    const orderId1 = RandomUtils.generateOrderId();
    const orderId2 = RandomUtils.generateOrderId();
    const timeDiff = RandomUtils.randomInt(1, 30);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'pedido_duplicado',
      severidade: 'media',
      suspect_user_id: userId,
      dados: {
        order_id_1: orderId1,
        order_id_2: orderId2,
        time_diff_seconds: timeDiff,
        identical_items: true,
        same_payment_method: true,
        similarity_score: 0.98
      },
      evidencias: [
        'Pedidos idênticos',
        `Diferença de ${timeDiff}s`,
        'Mesmo método de pagamento',
        'Alta similaridade detectada'
      ],
      risk_score: 65
    };

    const analysis = {
      tipo_fraude: 'pedido_duplicado',
      severidade: 'media',
      risk_score: 65,
      confidence: 0.75,
      descricao: `Pedidos duplicados detectados com ${event.dados.time_diff_seconds}s de diferença.`,
      evidencias: event.evidencias,
      acoes_recomendadas: [
        {
          acao: 'congelar_transacao',
          dados: {
            order_ids: [orderId1, orderId2],
            motivo: 'Duplicate order',
            revisao_manual: true
          },
          prioridade: 1,
          reversivel: true
        },
        {
          acao: 'marcar_pedido_como_risco',
          dados: {
            order_ids: [orderId2],
            nivel_risco: 'medio'
          },
          prioridade: 2,
          reversivel: true
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

  private static generateLocationManipulation(): AntiFraudExample {
    const userId = RandomUtils.generateUserId();
    const locations = RandomUtils.randomInt(3, 8);
    const distanceKm = RandomUtils.randomInt(500, 3000);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'manipulacao_localizacao',
      severidade: 'alta',
      suspect_user_id: userId,
      dados: {
        location_changes: locations,
        time_window_hours: 1,
        impossible_travel: true,
        gps_spoofing_detected: true,
        distance_km: distanceKm
      },
      evidencias: [
        `${locations} mudanças de localização em 1h`,
        'Viagem impossível detectada',
        'GPS spoofing provável',
        `Distância: ${distanceKm}km`
      ],
      risk_score: 85
    };

    const analysis = {
      tipo_fraude: 'manipulacao_localizacao',
      severidade: 'alta',
      risk_score: 85,
      confidence: 0.90,
      descricao: `Manipulação de GPS: ${locations} localizações diferentes em 1h com viagem impossível.`,
      evidencias: event.evidencias,
      acoes_recomendadas: [
        {
          acao: 'bloquear_usuario_temporario',
          dados: {
            user_id: userId,
            duracao_horas: 24,
            motivo: 'GPS manipulation'
          },
          prioridade: 1,
          reversivel: true
        },
        {
          acao: 'exigir_verificacao_adicional',
          dados: {
            user_id: userId,
            tipo: 'phone_verification',
            urgencia: 'alta'
          },
          prioridade: 2,
          reversivel: true
        },
        {
          acao: 'escalar_para_compliance',
          dados: {
            motivo: 'Location fraud',
            severidade: 'alta'
          },
          prioridade: 3,
          reversivel: true
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

  private static generateMerchantFraud(): AntiFraudExample {
    const merchantId = `merchant_${RandomUtils.randomInt(100, 999)}`;
    const fakeOrders = RandomUtils.randomInt(10, 50);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'estabelecimento_fraudando',
      severidade: 'critica',
      suspect_establishment_id: merchantId,
      dados: {
        fake_orders_count: fakeOrders,
        self_orders_detected: true,
        value_brl: RandomUtils.randomInt(1000, 10000),
        pattern_confidence: 0.95
      },
      evidencias: [
        `${fakeOrders} pedidos falsos detectados`,
        'Auto-pedidos confirmados',
        'Padrão de lavagem de dinheiro',
        'Alta confiança na detecção'
      ],
      risk_score: 95
    };

    const analysis = {
      tipo_fraude: 'estabelecimento_fraudando',
      severidade: 'critica',
      risk_score: 95,
      confidence: 0.95,
      descricao: `Estabelecimento ${merchantId} criando ${fakeOrders} pedidos falsos.`,
      evidencias: event.evidencias,
      acoes_recomendadas: [
        {
          acao: 'bloquear_usuario_permanente',
          dados: {
            merchant_id: merchantId,
            motivo: 'Merchant fraud',
            evidencias: event.evidencias
          },
          prioridade: 1,
          reversivel: false
        },
        {
          acao: 'congelar_transacao',
          dados: {
            merchant_id: merchantId,
            all_pending: true
          },
          prioridade: 2,
          reversivel: true
        },
        {
          acao: 'notificar_autoridades',
          dados: {
            tipo_crime: 'merchant_fraud',
            valor_estimado: event.dados.value_brl
          },
          prioridade: 3,
          reversivel: false
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

  private static generateMoneyLaundering(): AntiFraudExample {
    const userId = RandomUtils.generateUserId();
    const transactions = RandomUtils.randomInt(50, 200);
    const value = RandomUtils.randomInt(10000, 100000);
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: 'lavagem_dinheiro',
      severidade: 'critica',
      suspect_user_id: userId,
      dados: {
        transaction_count: transactions,
        total_value_brl: value,
        rapid_movement: true,
        smurfing_pattern: true,
        unusual_pattern_score: 0.92
      },
      evidencias: [
        `${transactions} transações em curto período`,
        `Valor total: R$ ${value}`,
        'Padrão de smurfing detectado',
        'Movimentação rápida e fragmentada'
      ],
      risk_score: 98
    };

    const analysis = {
      tipo_fraude: 'lavagem_dinheiro',
      severidade: 'critica',
      risk_score: 98,
      confidence: 0.92,
      descricao: `Lavagem de dinheiro: ${transactions} transações totalizando R$ ${value} com padrão de smurfing.`,
      evidencias: event.evidencias,
      acoes_recomendadas: [
        {
          acao: 'congelar_transacao',
          dados: {
            user_id: userId,
            all_pending: true,
            motivo: 'Money laundering investigation'
          },
          prioridade: 1,
          reversivel: false
        },
        {
          acao: 'notificar_autoridades',
          dados: {
            tipo_crime: 'money_laundering',
            valor_estimado: value,
            urgencia: 'critica'
          },
          prioridade: 2,
          reversivel: false
        },
        {
          acao: 'escalar_para_compliance',
          dados: {
            motivo: 'Lavagem de dinheiro detectada',
            severidade: 'critica',
            valor: value
          },
          prioridade: 3,
          reversivel: false
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

  private static generateNegativeCase(): AntiFraudExample {
    const userId = RandomUtils.generateUserId();
    
    const event = {
      timestamp: RandomUtils.randomTimestamp(),
      tipo: RandomUtils.randomElement(['multitentativas_suspeitas', 'pedido_duplicado', 'abuso_cupom']),
      severidade: 'baixa',
      suspect_user_id: userId,
      dados: {
        attempts: RandomUtils.randomInt(1, 4),
        within_normal_range: true,
        legitimate_user: true
      },
      evidencias: [
        'Comportamento dentro do normal',
        'Usuário verificado',
        'Sem indicadores de fraude'
      ],
      risk_score: RandomUtils.randomInt(10, 30)
    };

    const analysis = {
      tipo_fraude: event.tipo,
      severidade: 'baixa',
      risk_score: event.risk_score,
      confidence: 0.95,
      descricao: `Evento ${event.tipo} analisado: usuário legítimo, sem ações necessárias.`,
      evidencias: event.evidencias,
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
