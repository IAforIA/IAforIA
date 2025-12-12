import axios from 'axios';

export type Notifier = {
  info: (msg: string) => Promise<void>;
  debug: (msg: string) => Promise<void>;
  warn: (msg: string) => Promise<void>;
  error: (msg: string) => Promise<void>;
};

async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.CHAT_ID;
  if (!token || !chatId) return;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  // Mantém curto e evita formato complexo.
  const safe = text.length > 3500 ? `${text.slice(0, 3500)}…` : text;
  await axios.post(url, { chat_id: chatId, text: safe, disable_web_page_preview: true });
}

export function createNotifier(opts: { prod: boolean }): Notifier {
  const prefix = opts.prod ? '[agent:prod]' : '[agent]';

  const shouldTelegram = (process.env.AGENT_TELEGRAM || 'true').toLowerCase() !== 'false';

  const deliver = async (level: 'info' | 'warn' | 'error' | 'debug', msg: string) => {
    const line = `${prefix} ${msg}`;
    if (level === 'info') console.log(line);
    if (level === 'warn') console.warn(line);
    if (level === 'error') console.error(line);
    if (level === 'debug' && !opts.prod) console.log(line);

    // Telegram: só warn/error (evita spam). Debug nunca.
    if (!shouldTelegram) return;
    if (level === 'warn' || level === 'error') {
      try {
        await sendTelegram(line);
      } catch {
        // Nunca derruba o agente por falha de notificação.
      }
    }
  };

  return {
    info: async (msg) => deliver('info', msg),
    debug: async (msg) => deliver('debug', msg),
    warn: async (msg) => deliver('warn', msg),
    error: async (msg) => deliver('error', msg),
  };
}
