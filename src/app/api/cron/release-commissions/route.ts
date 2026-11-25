import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/auth/session';
import { toMoneyNumber } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const ZERO = new Prisma.Decimal('0.00');

function decMaxZero(value: Prisma.Decimal): Prisma.Decimal {
  return value.lt(ZERO) ? ZERO : value;
}

function isAuthorizedCronSecret(request: NextRequest): boolean {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (!configuredSecret || configuredSecret.length < 16) return false;

  const authHeader = request.headers.get('authorization')?.trim() ?? '';
  const bearerPrefix = 'Bearer ';
  if (!authHeader.startsWith(bearerPrefix)) return false;

  const provided = authHeader.slice(bearerPrefix.length).trim();
  const bufA = Buffer.from(provided, 'utf8');
  const bufB = Buffer.from(configuredSecret, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * POST /api/cron/release-commissions
 * Protected by EITHER `Authorization: Bearer <CRON_SECRET>` OR authenticated `ADMIN` session.
 * Atomically releases matured return-window commissions (`LOCKED_RETURN_WINDOW` -> `AVAILABLE`)
 * from `affiliate.lockedBalance` into withdrawable `affiliate.walletBalance` + `totalEarned`,
 * recording an idempotent `COMMISSION_RELEASED` WalletLedger entry per order.
 */
export async function POST(request: NextRequest) {
  try {
    let triggeredBy = 'CRON_JOB';

    if (!isAuthorizedCronSecret(request)) {
      const auth = await getVerifiedAuthContext(request).catch(() => null);
      if (!auth || auth.user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'غير مصرح بتشغيل مهمة تحرير العمولات', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
      triggeredBy = `ADMIN:${auth.user.email}`;
    }

    const now = new Date();
    const eligibleOrders = await prisma.order.findMany({
      where: {
        status: { in: ['DELIVERED', 'PARTIALLY_RETURNED'] },
        commissionState: 'LOCKED_RETURN_WINDOW',
        returnWindowEndsAt: { lte: now },
        affiliateId: { not: null },
      },
      select: { id: true, orderNumber: true },
      orderBy: { returnWindowEndsAt: 'asc' },
      take: 200,
    });

    let releasedCount = 0;
    let totalReleasedAmount = ZERO;
    const releasedOrderNumbers: string[] = [];

    for (const candidate of eligibleOrders) {
      try {
        const releasedAmount = await prisma.$transaction(async (tx) => {
          // 1. Lock Order row & re-verify eligibility inside transaction
          const lockedOrders = await tx.$queryRaw<
            Array<{
              id: string;
              order_number: string;
              affiliate_id: string | null;
              commission_state: string;
              total_commission: string;
              return_window_ends_at: Date | null;
            }>
          >`
            SELECT "id", "order_number", "affiliate_id", "commission_state", "total_commission"::text, "return_window_ends_at"
            FROM "orders"
            WHERE "id" = ${candidate.id}
            FOR UPDATE
          `;

          const ord = lockedOrders[0];
          if (
            !ord ||
            !ord.affiliate_id ||
            ord.commission_state !== 'LOCKED_RETURN_WINDOW' ||
            !ord.return_window_ends_at ||
            ord.return_window_ends_at > now
          ) {
            return null;
          }

          const comm = new Prisma.Decimal(ord.total_commission);

          // Zero commission remaining (edge case): simply mark AVAILABLE without ledger movement
          if (comm.lte(ZERO)) {
            await tx.order.update({
              where: { id: ord.id },
              data: { commissionState: 'AVAILABLE' },
            });
            return ZERO;
          }

          // 2. Lock Affiliate row
          const affRows = await tx.$queryRaw<
            Array<{
              id: string;
              wallet_balance: string;
              locked_balance: string;
              total_earned: string;
            }>
          >`
            SELECT "id", "wallet_balance"::text, "locked_balance"::text, "total_earned"::text
            FROM "affiliates"
            WHERE "id" = ${ord.affiliate_id}
            FOR UPDATE
          `;

          const aff = affRows[0];
          if (!aff) return null;

          const curWallet = new Prisma.Decimal(aff.wallet_balance);
          const curLocked = new Prisma.Decimal(aff.locked_balance);
          const curEarned = new Prisma.Decimal(aff.total_earned);
          const newWallet = curWallet.add(comm);

          // 3. Move commission from lockedBalance -> walletBalance & increment totalEarned
          await tx.affiliate.update({
            where: { id: aff.id },
            data: {
              lockedBalance: decMaxZero(curLocked.sub(comm)),
              walletBalance: newWallet,
              totalEarned: curEarned.add(comm),
            },
          });

          await tx.order.update({
            where: { id: ord.id },
            data: { commissionState: 'AVAILABLE' },
          });

          // 4. Immutable WalletLedger entry with idempotencyKey preventing double release
          await tx.walletLedger.create({
            data: {
              affiliateId: aff.id,
              orderId: ord.id,
              type: 'COMMISSION_RELEASED',
              amount: comm,
              balanceAfter: newWallet,
              idempotencyKey: `order:${ord.id}:released`,
              note: `تحرير عمولة الطلب ${ord.order_number} بعد انتهاء فترة الاسترجاع (${triggeredBy})`,
            },
          });

          return comm;
        });

        if (releasedAmount !== null) {
          releasedCount++;
          totalReleasedAmount = totalReleasedAmount.add(releasedAmount);
          releasedOrderNumbers.push(candidate.orderNumber);
        }
      } catch (orderErr) {
        if (
          orderErr instanceof Prisma.PrismaClientKnownRequestError &&
          orderErr.code === 'P2002'
        ) {
          // Already released idempotently in a concurrent run — safe to skip
          continue;
        }
        console.error(`Failed releasing commission for order ${candidate.id}:`, orderErr);
      }
    }

    return NextResponse.json({
      success: true,
      triggeredBy,
      checkedCount: eligibleOrders.length,
      releasedCount,
      totalReleasedAmount: toMoneyNumber(totalReleasedAmount),
      releasedOrderNumbers,
    });
  } catch (err) {
    console.error('API POST /api/cron/release-commissions error:', err);
    return NextResponse.json(
      { error: 'تعذر تنفيذ مهمة تحرير العمولات', code: 'COMMISSION_RELEASE_FAILED' },
      { status: 500 }
    );
  }
}
