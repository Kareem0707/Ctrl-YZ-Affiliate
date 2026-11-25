import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { enforceRateLimit } from '@/lib/rateLimit';
import {
  maskVerificationTarget,
  sendOtpNotification,
} from '@/lib/notifications/otpSender';

export const dynamic = 'force-dynamic';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_COOLDOWN_MS = 60 * 1000; // 60 seconds

const sendOtpSchema = z.object({
  channel: z.enum(['WHATSAPP_OTP', 'EMAIL']).default('WHATSAPP_OTP'),
});

function hashOtpToken(userId: string, channel: string, code: string): string {
  return crypto
    .createHash('sha256')
    .update(`${userId}:${channel}:${code}`)
    .digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    const rateLimited = await enforceRateLimit(request, {
      keyPrefix: 'auth:verify:send',
      identifier: auth.user.id,
      limit: 5,
      windowSeconds: 60,
    });
    if (rateLimited) return rateLimited;

    const rawBody = await request.json().catch(() => ({}));
    const parsed = sendOtpSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'قناة التحقق غير صالحة', code: 'INVALID_CHANNEL' },
        { status: 400 }
      );
    }

    const { channel } = parsed.data;
    const target =
      channel === 'WHATSAPP_OTP'
        ? auth.affiliate?.whatsapp || auth.affiliate?.phone
        : auth.user.email;

    if (!target) {
      return NextResponse.json(
        {
          error:
            channel === 'WHATSAPP_OTP'
              ? 'يرجى استكمال تسجيل رقم الهاتف والواتساب أولاً قبل طلب رمز التحقق'
              : 'لا يوجد بريد إلكتروني مرتبط بالحساب',
          code: 'MISSING_TARGET',
        },
        { status: 400 }
      );
    }

    // Enforce 60-second resend cooldown per (userId, channel)
    const now = new Date();
    const cooldownCutoff = new Date(now.getTime() - OTP_COOLDOWN_MS);
    const recentToken = await prisma.verificationToken.findFirst({
      where: {
        userId: auth.user.id,
        channel,
        createdAt: { gt: cooldownCutoff },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentToken) {
      const elapsedMs = now.getTime() - recentToken.createdAt.getTime();
      const retryAfterSeconds = Math.max(1, Math.ceil((OTP_COOLDOWN_MS - elapsedMs) / 1000));
      return NextResponse.json(
        {
          error: `يرجى الانتظار ${retryAfterSeconds} ثانية قبل إعادة إرسال رمز جديد`,
          code: 'OTP_COOLDOWN',
          retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // Generate cryptographically random 6-digit OTP and store SHA-256 hash only
    const code = crypto.randomInt(100000, 1000000).toString();
    const tokenHash = hashOtpToken(auth.user.id, channel, code);
    const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

    await prisma.$transaction(async (tx) => {
      // Invalidate any previous active unconsumed tokens for this user + channel
      await tx.verificationToken.updateMany({
        where: {
          userId: auth.user.id,
          channel,
          consumedAt: null,
        },
        data: { consumedAt: now },
      });

      await tx.verificationToken.create({
        data: {
          userId: auth.user.id,
          channel,
          target,
          tokenHash,
          expiresAt,
          attempts: 0,
        },
      });
    });

    const delivery = await sendOtpNotification({
      channel,
      target,
      code,
      recipientName: auth.user.name,
    });

    return NextResponse.json({
      success: true,
      channel,
      maskedTarget: maskVerificationTarget(channel, target),
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      cooldownSeconds: Math.floor(OTP_COOLDOWN_MS / 1000),
      provider: delivery.provider,
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API POST /api/auth/verify/send error:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'تعذر إرسال رمز التحقق حالياً',
        code: 'OTP_SEND_FAILED',
      },
      { status: 500 }
    );
  }
}
