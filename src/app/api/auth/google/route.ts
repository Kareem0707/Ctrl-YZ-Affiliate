import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getConfiguredAdminEmails } from '@/lib/env';
import { enforceRateLimit } from '@/lib/rateLimit';
import {
  computeNextStep,
  serializeAffiliateDTO,
  serializeUserDTO,
  setSessionCookie,
} from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const googleAuthBodySchema = z.object({
  credential: z.string().trim().min(20, 'رمز اعتماد Google غير صالح'),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await enforceRateLimit(request, {
      keyPrefix: 'auth:google',
      limit: 20,
      windowSeconds: 60,
    });
    if (rateLimited) return rateLimited;

    const rawBody = await request.json().catch(() => null);
    const parsed = googleAuthBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'رمز اعتماد Google مفقود أو غير صالح', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    const googleClientId =
      process.env.GOOGLE_CLIENT_ID?.trim() ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

    if (!googleClientId || googleClientId.includes('your_')) {
      return NextResponse.json(
        { error: 'معرف Google Client ID غير مهيأ على الخادم', code: 'GOOGLE_AUTH_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    const oauthClient = new OAuth2Client(googleClientId);
    let payload;
    try {
      const ticket = await oauthClient.verifyIdToken({
        idToken: parsed.data.credential,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.warn('[Auth/Google] ID token verification failed:', verifyErr);
      return NextResponse.json(
        { error: 'فشل التحقق من توقيع حساب Google أو انتهت صلاحية الجلسة', code: 'INVALID_GOOGLE_TOKEN' },
        { status: 401 }
      );
    }

    if (!payload || !payload.sub || !payload.email) {
      return NextResponse.json(
        { error: 'بيانات حساب Google غير مكتملة', code: 'INCOMPLETE_GOOGLE_PROFILE' },
        { status: 401 }
      );
    }

    if (!payload.email_verified) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني في حساب Google غير موثّق', code: 'UNVERIFIED_GOOGLE_EMAIL' },
        { status: 403 }
      );
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const googleSub = payload.sub;
    const displayName = (payload.name || normalizedEmail.split('@')[0]).trim();
    const avatarUrl = payload.picture || null;
    const isAdminEmail = getConfiguredAdminEmails().includes(normalizedEmail);
    const now = new Date();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ googleSub }, { email: normalizedEmail }],
      },
      include: { affiliate: true },
    });

    const userWithAffiliate = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            googleSub,
            email: normalizedEmail,
            name: existingUser.name || displayName,
            avatarUrl: avatarUrl ?? existingUser.avatarUrl,
            emailVerifiedAt: existingUser.emailVerifiedAt ?? now,
            role: isAdminEmail ? 'ADMIN' : existingUser.role,
          },
          include: { affiliate: true },
        })
      : await prisma.user.create({
          data: {
            googleSub,
            email: normalizedEmail,
            name: displayName,
            avatarUrl,
            emailVerifiedAt: now,
            role: isAdminEmail ? 'ADMIN' : 'CUSTOMER',
          },
          include: { affiliate: true },
        });

    const { affiliate, ...userOnly } = userWithAffiliate;
    const nextStep = computeNextStep(userOnly, affiliate);

    const response = NextResponse.json({
      authenticated: true,
      user: serializeUserDTO(userOnly),
      affiliate: affiliate ? serializeAffiliateDTO(affiliate, userOnly) : null,
      nextStep,
    });

    await setSessionCookie(response, {
      userId: userOnly.id,
      email: userOnly.email,
      role: userOnly.role,
      affiliateId: affiliate?.id ?? null,
      affiliateStatus: affiliate?.status ?? null,
    });

    return response;
  } catch (error: any) {
    console.error('API POST /api/auth/google error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول عبر Google', code: 'AUTH_INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
