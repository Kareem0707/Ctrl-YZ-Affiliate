import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync
 * Lightweight Prisma-backed change-detection endpoint replacing legacy serverDb.ts.
 * Scopes operational counts strictly by verified session role (never leaks private stats publicly).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const since = Number(searchParams.get('since') || 0);
    const auth = await getVerifiedAuthContext(request).catch(() => null);

    const [latestProduct, settingsRow, latestShipping, activeProductsCount] = await Promise.all([
      prisma.product.findFirst({
        select: { updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.platformSettings.findUnique({
        where: { id: 1 },
        select: { updatedAt: true },
      }),
      prisma.shippingRate.findFirst({
        select: { updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.product.count({
        where: { isActive: true, archivedAt: null },
      }),
    ]);

    const timestamps: number[] = [
      latestProduct?.updatedAt.getTime() ?? 0,
      settingsRow?.updatedAt.getTime() ?? 0,
      latestShipping?.updatedAt.getTime() ?? 0,
    ];

    let counts: Record<string, number> = {
      products: activeProductsCount,
    };

    if (auth?.user.role === 'ADMIN') {
      const [latestOrder, latestAffiliate, latestPayout, ordersCount, marketersCount, withdrawalsCount] =
        await Promise.all([
          prisma.order.findFirst({ select: { updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
          prisma.affiliate.findFirst({ select: { updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
          prisma.payoutRequest.findFirst({ select: { updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
          prisma.order.count(),
          prisma.affiliate.count(),
          prisma.payoutRequest.count(),
        ]);

      timestamps.push(
        latestOrder?.updatedAt.getTime() ?? 0,
        latestAffiliate?.updatedAt.getTime() ?? 0,
        latestPayout?.updatedAt.getTime() ?? 0
      );

      counts = {
        products: activeProductsCount,
        orders: ordersCount,
        marketers: marketersCount,
        withdrawals: withdrawalsCount,
      };
    } else if (auth?.affiliate) {
      const [latestOwnOrder, latestOwnPayout, ownOrdersCount, ownPayoutsCount] = await Promise.all([
        prisma.order.findFirst({
          where: { affiliateId: auth.affiliate.id },
          select: { updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.payoutRequest.findFirst({
          where: { affiliateId: auth.affiliate.id },
          select: { updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.order.count({ where: { affiliateId: auth.affiliate.id } }),
        prisma.payoutRequest.count({ where: { affiliateId: auth.affiliate.id } }),
      ]);

      timestamps.push(
        auth.affiliate.updatedAt.getTime(),
        latestOwnOrder?.updatedAt.getTime() ?? 0,
        latestOwnPayout?.updatedAt.getTime() ?? 0
      );

      counts = {
        products: activeProductsCount,
        orders: ownOrdersCount,
        withdrawals: ownPayoutsCount,
      };
    }

    const lastModified = Math.max(0, ...timestamps);
    const hasChanges = since > 0 && lastModified > since;

    return NextResponse.json({
      status: 'connected',
      lastModified,
      hasChanges,
      events: [],
      counts,
    });
  } catch (error) {
    console.error('API GET /api/sync error:', error);
    return NextResponse.json(
      { error: 'تعذر فحص حالة المزامنة', code: 'SYNC_ERROR' },
      { status: 500 }
    );
  }
}
