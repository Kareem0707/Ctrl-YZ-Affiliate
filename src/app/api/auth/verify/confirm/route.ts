import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  computeNextStep,
  requireAuth,
  setSessionCookie,
} from '@/lib/auth/session';
import { enforceRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const MAX_VERIFICATION_ATTEMPTS = 5;

const confirmOtpSchema = z.object({
  channel: z.enum(['WHATSAPP_OTP', 'EMAIL']).default('WHATSAPP_OTP'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'رمز التحقق يجب أن يتكون من 6 أرقام'),
});

function hashOtpToken(userId: string, channel: string, code: string): string {
  return crypto
    .createHash('sha256')
    .update(`${userId}:${channel}:${code}`)
    .digest('hex');
}

function timingSafeHexEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    const rateLimited = await enforceRateLimit(request, {
      keyPrefix: 'auth:verify:confirm',
      identifier: auth.user.id,
      limit: 15,
      windowSeconds: 60,
    });
    if (rateLimited) return rateLimited;

    const rawBody = await request.json().catch(() => null);
    const parsed = confirmOtpSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'رمز التحقق غير صالح',
          code: 'INVALID_OTP_FORMAT',
        },
        { status: 400 }
      );
    }

    const { channel, code } = parsed.data;
    const expectedHash = hashOtpToken(auth.user.id, channel, code);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const token = await tx.verificationToken.findFirst({
        where: {
          userId: auth.user.id,
          channel,
          consumedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!token) {
        return {
          ok: false as const,
          status: 400,
          code: 'OTP_NOT_FOUND',
          error: 'لا يوجد رمز تحقق نشط. يرجى طلب إرسال رمز جديد.',
        };
      }

      if (token.expiresAt <= now) {
        await tx.verificationToken.update({
          where: { id: token.id },
          data: { consumedAt: now },
        });
        return {
          ok: false as const,
          status: 400,
          code: 'OTP_EXPIRED',
          error: 'انتهت صلاحية رمز التحقق (10 دقائق). يرجى طلب رمز جديد.',
        };
      }

      if (token.attempts >= MAX_VERIFICATION_ATTEMPTS) {
        await tx.verificationToken.update({
          where: { id: token.id },
          data: { consumedAt: now },
        });
        return {
          ok: false as const,
          status: 429,
          code: 'OTP_MAX_ATTEMPTS',
          error: 'تم تجاوز الحد الأقصى لمحاولات التحقق (5 محاولات). يرجى طلب رمز جديد.',
        };
      }

      if (!timingSafeHexEqual(token.tokenHash, expectedHash)) {
        const updated = await tx.verificationToken.update({
          where: { id: token.id },
          data: {
            attempts: { increment: 1 },
            ...(token.attempts + 1 >= MAX_VERIFICATION_ATTEMPTS ? { consumedAt: now } : {}),
          },
        });
        const remaining = Math.max(0, MAX_VERIFICATION_ATTEMPTS - updated.attempts);
        return {
          ok: false as const,
          status: remaining === 0 ? 429 : 400,
          code: 'OTP_MISMATCH',
          error:
            remaining > 0
              ? `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}`
              : 'تم استنفاد جميع المحاولات. يرجى طلب رمز جديد.',
        };
      }

      // Atomically consume token (single-use guard via consumedAt: null)
      const consumed = await tx.verificationToken.updateMany({
        where: { id: token.id, consumedAt: null },
        data: { consumedAt: now },
      });

      if (consumed.count !== 1) {
        return {
          ok: false as const,
          status: 409,
          code: 'OTP_ALREADY_USED',
          error: 'تم استخدام هذا الرمز بالفعل.',
        };
      }

      const updatedUser = await tx.user.update({
        where: { id: auth.user.id },
        data:
          channel === 'WHATSAPP_OTP'
            ? { phoneVerifiedAt: now }
            : { emailVerifiedAt: now },
      });

      let updatedAffiliate = auth.affiliate;
      if (auth.affiliate && auth.affiliate.status === 'UNVERIFIED') {
        updatedAffiliate = await tx.affiliate.update({
          where: { id: auth.affiliate.id },
          data: { status: 'PENDING' },
        });
      }

      return {
        ok: true as const,
        user: updatedUser,
        affiliate: updatedAffiliate,
      };
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status }
      );
    }

    const nextStep = computeNextStep(result.user, result.affiliate);
    const response = NextResponse.json({
      success: true,
      verified: true,
      affiliateStatus: result.affiliate?.status ?? null,
      nextStep,
    });

    await setSessionCookie(response, {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      affiliateId: result.affiliate?.id ?? null,
      affiliateStatus: result.affiliate?.status ?? null,
    });

    return response;
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API POST /api/auth/verify/confirm error:', err);
    return NextResponse.json(
      { error: 'تعذر تأكيد رمز التحقق حالياً', code: 'OTP_CONFIRM_FAILED' },
      { status: 500 }
    );
  }
}
