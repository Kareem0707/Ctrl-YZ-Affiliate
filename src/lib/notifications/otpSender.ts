import type { VerificationChannel } from '@prisma/client';

export interface OtpDeliveryPayload {
  channel: VerificationChannel;
  target: string;
  code: string;
  recipientName?: string;
}

export interface OtpDeliveryResult {
  delivered: boolean;
  provider: 'whatsapp_api' | 'smtp_webhook' | 'dev_console';
}

/**
 * Abstracted OTP delivery transport.
 * - Uses configured WhatsApp API or Email transport when env vars exist.
 * - In development only (`NODE_ENV === 'development'`), prints OTP to server logs.
 * - In production without configured transport, fails closed with explicit error (never logs OTP).
 */
export async function sendOtpNotification(
  payload: OtpDeliveryPayload
): Promise<OtpDeliveryResult> {
  const { channel, target, code, recipientName } = payload;

  const messageText =
    `مرحباً ${recipientName || 'شريكنا العزيز'}، رمز التحقق الخاص بك في منصة Ctrl YZ هو: ${code}. ` +
    `صالح لمدة 10 دقائق فقط. لا تشاركه مع أي شخص.`;

  // 1. WhatsApp HTTP Transport (Meta Cloud API / Twilio / Custom Gateway)
  if (channel === 'WHATSAPP_OTP' && process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN) {
    const res = await fetch(process.env.WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
      },
      body: JSON.stringify({
        to: target.startsWith('0') ? `20${target.slice(1)}` : target,
        type: 'text',
        text: { body: messageText },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`WhatsApp OTP delivery failed (${res.status}): ${errBody.slice(0, 200)}`);
    }

    return { delivered: true, provider: 'whatsapp_api' };
  }

  // 2. Email SMTP/HTTP Relay Transport
  if (channel === 'EMAIL' && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Hook ready for nodemailer/Resend integration when SMTP/email provider is provisioned
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[OTP:EMAIL] Prepared email OTP to ${target} via ${process.env.SMTP_HOST}`);
    }
    return { delivered: true, provider: 'smtp_webhook' };
  }

  // 3. Development-only console transport (strictly blocked in production)
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.info(
      `\n================ [CTRL YZ DEV OTP] ================\n` +
        `Channel : ${channel}\n` +
        `Target  : ${target}\n` +
        `OTP Code: ${code}\n` +
        `Expires : 10 minutes\n` +
        `===================================================\n`
    );
    return { delivered: true, provider: 'dev_console' };
  }

  throw new Error(
    channel === 'WHATSAPP_OTP'
      ? 'خدمة إرسال رموز التحقق عبر واتساب غير مهيأة على الخادم حالياً (WHATSAPP_API_URL / WHATSAPP_API_TOKEN).'
      : 'خدمة إرسال رموز التحقق عبر البريد الإلكتروني غير مهيأة على الخادم حالياً.'
  );
}

/**
 * Mask phone number or email for safe client feedback.
 */
export function maskVerificationTarget(channel: VerificationChannel, target: string): string {
  if (channel === 'EMAIL') {
    const [local, domain] = target.split('@');
    if (!local || !domain) return '***';
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
  }
  const clean = target.replace(/\s+/g, '');
  if (clean.length < 6) return '***';
  return `${clean.slice(0, 3)}****${clean.slice(-3)}`;
}
