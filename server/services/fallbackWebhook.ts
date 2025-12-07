import { appendFileSync } from 'fs';
import { join } from 'path';

interface FallbackContext {
  orderNumber?: string;
  userName?: string;
  userType?: 'motoboy' | 'estabelecimento';
}

interface SlackMessage {
  text: string;
  blocks: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
    };
    fields?: Array<{
      type: string;
      text: string;
    }>;
  }>;
}

// Log de fallbacks
function logFallback(
  userType: string,
  message: string,
  aiReply: string,
  confidence: number,
  context?: FallbackContext
) {
  const logPath = join(process.cwd(), 'fallbacks.log');
  const timestamp = new Date().toISOString();
  
  const logEntry = {
    timestamp,
    userType,
    confidence,
    message,
    aiReply,
    context: context || {}
  };
  
  try {
    appendFileSync(
      logPath,
      JSON.stringify(logEntry) + '\n',
      'utf-8'
    );
    console.log(`📝 Fallback registrado: ${logPath}`);
  } catch (error) {
    console.error('❌ Erro ao salvar fallback log:', error);
  }
}

// Enviar notificação para Slack
async function sendSlackNotification(
  userType: string,
  message: string,
  aiReply: string,
  confidence: number,
  context?: FallbackContext
): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('⚠️  SLACK_WEBHOOK_URL não configurado, pulando notificação');
    return false;
  }

  const emoji = userType === 'motoboy' ? '📱' : '🏪';
  const color = confidence < 0.5 ? '#ff0000' : '#ffa500';

  const slackMessage: SlackMessage = {
    text: `${emoji} IA com baixa confiança - Necessita revisão humana`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${userType.toUpperCase()} - Baixa Confiança (${(confidence * 100).toFixed(0)}%)`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Tipo:*\n${userType}`
          },
          {
            type: 'mrkdwn',
            text: `*Confiança:*\n${(confidence * 100).toFixed(1)}%`
          },
          {
            type: 'mrkdwn',
            text: `*Horário:*\n${new Date().toLocaleString('pt-BR')}`
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n⚠️ Necessita revisão`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Mensagem do usuário:*\n> ${message}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Resposta da IA:*\n> ${aiReply}`
        }
      }
    ]
  };

  // Adicionar contexto se disponível
  if (context && Object.keys(context).length > 0) {
    slackMessage.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Contexto:*\n\`\`\`${JSON.stringify(context, null, 2)}\`\`\``
      }
    });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackMessage)
    });

    if (!response.ok) {
      throw new Error(`Slack API retornou: ${response.status}`);
    }

    console.log('✅ Notificação Slack enviada com sucesso');
    return true;

  } catch (error) {
    console.error('❌ Erro ao enviar notificação Slack:', error);
    return false;
  }
}

// Função principal de fallback
export async function triggerFallback(
  userType: 'motoboy' | 'estabelecimento',
  message: string,
  aiReply: string,
  confidence: number,
  context?: FallbackContext
): Promise<void> {
  console.log('\n⚠️  FALLBACK ACIONADO!');
  console.log(`   Tipo: ${userType}`);
  console.log(`   Confiança: ${(confidence * 100).toFixed(1)}%`);
  console.log(`   Mensagem: "${message}"`);
  console.log(`   Resposta IA: "${aiReply}"\n`);

  // 1. Salvar log local
  logFallback(userType, message, aiReply, confidence, context);

  // 2. Tentar enviar para Slack
  const slackSent = await sendSlackNotification(
    userType,
    message,
    aiReply,
    confidence,
    context
  );

  if (slackSent) {
    console.log('📬 Equipe de suporte notificada via Slack');
  } else {
    console.log('📝 Fallback registrado apenas localmente');
  }

  // 3. Aqui você pode adicionar outras integrações
  // - Enviar email
  // - Criar ticket no sistema de suporte
  // - Notificar via WebSocket para dashboard
  // - Etc.
}

// Função para analisar logs de fallback
export async function analyzeFallbacks(): Promise<{
  total: number;
  byType: Record<string, number>;
  avgConfidence: number;
  last24h: number;
}> {
  try {
    const { readFileSync, existsSync } = await import('fs');
    const logPath = join(process.cwd(), 'fallbacks.log');

    if (!existsSync(logPath)) {
      return {
        total: 0,
        byType: {},
        avgConfidence: 0,
        last24h: 0
      };
    }

    const logs = readFileSync(logPath, 'utf-8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const byType: Record<string, number> = {};
    let totalConfidence = 0;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let last24hCount = 0;

    logs.forEach((log: any) => {
      // Contar por tipo
      byType[log.userType] = (byType[log.userType] || 0) + 1;
      
      // Somar confiança
      totalConfidence += log.confidence;
      
      // Contar últimas 24h
      if (new Date(log.timestamp).getTime() > oneDayAgo) {
        last24hCount++;
      }
    });

    return {
      total: logs.length,
      byType,
      avgConfidence: logs.length > 0 ? totalConfidence / logs.length : 0,
      last24h: last24hCount
    };

  } catch (error) {
    console.error('Erro ao analisar fallbacks:', error);
    return {
      total: 0,
      byType: {},
      avgConfidence: 0,
      last24h: 0
    };
  }
}

// Exportar para uso em outros módulos
export default {
  triggerFallback,
  analyzeFallbacks
};
