import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { toMoneyNumber } from '@/lib/validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats
 * ADMIN-only aggregate SQL metrics:
 * - Excludes BOTH CANCELLED and RETURNED orders from totalRevenue & totalWholesale.
 * - Reports platformProfit & deliveredCommissions from DELIVERED + PARTIALLY_RETURNED orders.
 * - Aggregates affiliate walletBalance (available), lockedBalance (return window), and pendingBalance.
 * - Reports matured locked commissions ready for release.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ['ADMIN']);

    const now = new Date();

    const [
      activeRevenueAgg,
      deliveredProfitAgg,
      orderStatusGroups,
      affiliateBalanceAgg,
      affiliateStatusGroups,
      activeProductsCount,
      pendingPayoutsAgg,
      releasableOrdersAgg,
    ] = await Promise.all([
      // Exclude BOTH CANCELLED and RETURNED from revenue & wholesale metrics
      prisma.order.aggregate({
        where: {
          status: { notIn: ['CANCELLED', 'RETURNED'] },
        },
        _sum: {
          totalAmount: true,
          subtotal: true,
          totalWholesale: true,
        },
        _count: { _all: true },
      }),

      // Delivered & partially-returned realized profit & net commissions
      prisma.order.aggregate({
        where: {
          status: { in: ['DELIVERED', 'PARTIALLY_RETURNED'] },
        },
        _sum: {
          platformProfit: true,
          totalCommission: true,
        },
        _count: { _all: true },
      }),

      prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),

      prisma.affiliate.aggregate({
        _sum: {
          walletBalance: true,
          lockedBalance: true,
          pendingBalance: true,
          totalEarned: true,
          totalWithdrawn: true,
        },
        _count: { _all: true },
      }),

      prisma.affiliate.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),

      prisma.product.count({
        where: { isActive: true, archivedAt: null },
      }),

      prisma.payoutRequest.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: { _all: true },
      }),

      prisma.order.aggregate({
        where: {
          status: { in: ['DELIVERED', 'PARTIALLY_RETURNED'] },
          commissionState: 'LOCKED_RETURN_WINDOW',
          returnWindowEndsAt: { lte: now },
          affiliateId: { not: null },
        },
        _sum: { totalCommission: true },
        _count: { _all: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    let totalOrdersCount = 0;
    for (const grp of orderStatusGroups) {
      statusCounts[grp.status] = grp._count._all;
      totalOrdersCount += grp._count._all;
    }

    const affiliateCounts: Record<string, number> = {};
    for (const grp of affiliateStatusGroups) {
      affiliateCounts[grp.status] = grp._count._all;
    }

    const deliveredCount =
      (statusCounts.DELIVERED ?? 0) + (statusCounts.PARTIALLY_RETURNED ?? 0);
    const deliveryRate =
      totalOrdersCount > 0 ? Math.round((deliveredCount / totalOrdersCount) * 100) : 0;

    return NextResponse.json({
      totalRevenue: toMoneyNumber(activeRevenueAgg._sum.totalAmount),
      totalSubtotal: toMoneyNumber(activeRevenueAgg._sum.subtotal),
      totalWholesale: toMoneyNumber(activeRevenueAgg._sum.totalWholesale),
      totalProfit: toMoneyNumber(deliveredProfitAgg._sum.platformProfit),
      totalCommissions: toMoneyNumber(deliveredProfitAgg._sum.totalCommission),
      ordersCount: totalOrdersCount,
      activeOrdersCount: activeRevenueAgg._count._all,
      deliveredCount,
      returnedCount: statusCounts.RETURNED ?? 0,
      partiallyReturnedCount: statusCounts.PARTIALLY_RETURNED ?? 0,
      cancelledCount: statusCounts.CANCELLED ?? 0,
      pendingOrdersCount: statusCounts.PENDING ?? 0,
      deliveryRate,
      productsCount: activeProductsCount,
      marketersCount: affiliateBalanceAgg._count._all,
      activeMarketersCount: affiliateCounts.ACTIVE ?? 0,
      pendingMarketersCount: (affiliateCounts.PENDING ?? 0) + (affiliateCounts.UNVERIFIED ?? 0),
      affiliateBalances: {
        walletBalance: toMoneyNumber(affiliateBalanceAgg._sum.walletBalance),
        lockedBalance: toMoneyNumber(affiliateBalanceAgg._sum.lockedBalance),
        pendingBalance: toMoneyNumber(affiliateBalanceAgg._sum.pendingBalance),
        totalEarned: toMoneyNumber(affiliateBalanceAgg._sum.totalEarned),
        totalWithdrawn: toMoneyNumber(affiliateBalanceAgg._sum.totalWithdrawn),
      },
      releasableCommissions: {
        count: releasableOrdersAgg._count._all,
        amount: toMoneyNumber(releasableOrdersAgg._sum.totalCommission),
      },
      pendingWithdrawalsCount: pendingPayoutsAgg._count._all,
      pendingWithdrawalsAmount: toMoneyNumber(pendingPayoutsAgg._sum.amount),
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API GET /api/admin/stats error:', err);
    return NextResponse.json(
      { error: 'تعذر حساب إحصائيات المنصة', code: 'ADMIN_STATS_FAILED' },
      { status: 500 }
    );
  }
}
