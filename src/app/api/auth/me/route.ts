import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  clearSessionCookie,
  computeNextStep,
  getSessionFromRequest,
  getVerifiedAuthContext,
  serializeAffiliateDTO,
  serializeUserDTO,
  setSessionCookie,
} from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rawSession = await getSessionFromRequest(request);
    if (!rawSession) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        affiliate: null,
        nextStep: null,
      });
    }

    const ctx = await getVerifiedAuthContext(request);
    if (!ctx) {
      const res = NextResponse.json({
        authenticated: false,
        user: null,
        affiliate: null,
        nextStep: null,
      });
      clearSessionCookie(res);
      return res;
    }

    let orderStats:
      | { ordersCount: number; deliveredCount: number; clicksCount: number }
      | undefined;
    if (ctx.affiliate) {
      const [ordersCount, deliveredCount, clicksCount] = await Promise.all([
        prisma.order.count({ where: { affiliateId: ctx.affiliate.id } }),
        prisma.order.count({
          where: {
            affiliateId: ctx.affiliate.id,
            status: { in: ['DELIVERED', 'PARTIALLY_RETURNED'] },
          },
        }),
        prisma.affiliateClick.count({ where: { affiliateId: ctx.affiliate.id } }),
      ]);
      orderStats = { ordersCount, deliveredCount, clicksCount };
    }

    const nextStep = computeNextStep(ctx.user, ctx.affiliate);
    const response = NextResponse.json({
      authenticated: true,
      user: serializeUserDTO(ctx.user),
      affiliate: ctx.affiliate
        ? serializeAffiliateDTO(ctx.affiliate, ctx.user, orderStats)
        : null,
      nextStep,
    });

    // Keep HttpOnly session claims synchronized with live DB role/status
    const drifted =
      rawSession.role !== ctx.session.role ||
      rawSession.affiliateId !== ctx.session.affiliateId ||
      rawSession.affiliateStatus !== ctx.session.affiliateStatus;

    if (drifted) {
      await setSessionCookie(response, ctx.session);
    }

    return response;
  } catch (error) {
    console.error('API GET /api/auth/me error:', error);
    return NextResponse.json(
      { error: 'تعذر التحقق من الجلسة الحالية', code: 'SESSION_CHECK_FAILED' },
      { status: 500 }
    );
  }
}
