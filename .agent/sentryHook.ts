import crypto from 'crypto';

export function verifySentryWebhook(rawBody: string, signature: string | undefined): boolean {
  const secret = process.env.SENTRY_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signature) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingSafeEqualHex(expected, signature);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
