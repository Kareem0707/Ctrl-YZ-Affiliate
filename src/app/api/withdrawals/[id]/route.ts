import { NextRequest, NextResponse } from 'next/server';
import { Prisma, type PayoutStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { serializeWithdrawalDTO } from '@/lib/serializers';
import { withdrawalProcessSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const ZERO = new Prisma.Decimal('0.00');

const payoutInclude = {
  affiliate: {
    select: {
      id: true,
      phone: true,
      user: { select: { name: true } },
    },
  },
} satisfies Prisma.PayoutRequestInclude;

/**
 * PATCH /api/withdrawals/[id]
 * ADMIN-only atomic payout approval / rejection:
 * - Row-locks PayoutRequest via SELECT ... FOR UPDATE.
 * - Immediately returns 409 Conflict if status !== 'PENDING' (eliminates double-refund / double-approve exploit).
 * - On APPROVED: increments affiliate.totalWithdrawn and logs WITHDRAWAL_PAID ledger entry.
 * - On REJECTED: refunds exact amount back to affiliate.walletBalance and logs WITHDRAWAL_REFUND ledger entry.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);

    const rawBody = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json(
        { error: 'بيانات معالجة السحب غير صالحة', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    const normalizedStatus =
      typeof rawBody.status === 'string' ? rawBody.status.trim().toUpperCase() : '';
    const receiptOrReason =
      typeof rawBody.receiptOrReason === 'string' ? rawBody.receiptOrReason.trim() : undefined;

    const candidate =
      normalizedStatus === 'APPROVED'
        ? {
            id: params.id,
            status: 'APPROVED' as const,
            receiptRef:
              (typeof rawBody.receiptRef === 'string' && rawBody.receiptRef.trim()) ||
              receiptOrReason ||
              '',
          }
        : normalizedStatus === 'REJECTED'
        ? {
            id: params.id,
            status: 'REJECTED' as const,
            rejectionReason:
              (typeof rawBody.rejectionReason === 'string' && rawBody.rejectionReason.trim()) ||
              receiptOrReason ||
              '',
          }
        : rawBody;

    const parsed = withdrawalProcessSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'بيانات معالجة طلب السحب غير صالحة',
          code: 'VALIDATION_ERROR',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const processedPayout = await prisma.$transaction(async (tx) => {
      // 1. Pessimistic Row Lock on PayoutRequest
      const lockedPayouts = await tx.$queryRaw<
        Array<{
          id: string;
          request_code: string;
          status: PayoutStatus;
          affiliate_id: string;
          amount: string;
        }>
      >`
        SELECT "id", "request_code", "status", "affiliate_id", "amount"::text
        FROM "payout_requests"
        WHERE "id" = ${params.id}
        FOR UPDATE
      `;

      const locked = lockedPayouts[0];
      if (!locked) {
        throw NextResponse.json(
          { error: 'طلب السحب غير موجود', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      // 2. Strict Single-Transition Guard (prevents repeated reject double-refund & double-approve)
      if (locked.status !== 'PENDING') {
        throw NextResponse.json(
          {
            error: `تمت معالجة طلب السحب هذا مسبقاً وحالته الحالية هي (${locked.status})`,
            code: 'PAYOUT_ALREADY_PROCESSED',
            currentStatus: locked.status,
          },
          { status: 409 }
        );
      }

      // 3. Pessimistic Row Lock on Affiliate
      const affRows = await tx.$queryRaw<
        Array<{ id: string; wallet_balance: string; total_withdrawn: string }>
      >`
        SELECT "id", "wallet_balance"::text, "total_withdrawn"::text
        FROM "affiliates"
        WHERE "id" = ${locked.affiliate_id}
        FOR UPDATE
      `;

      const aff = affRows[0];
      if (!aff) {
        throw NextResponse.json(
          { error: 'حساب المسوق المرتبط بطلب السحب غير موجود', code: 'AFFILIATE_NOT_FOUND' },
          { status: 404 }
        );
      }

      const amountDec = new Prisma.Decimal(locked.amount);
      const currentWallet = new Prisma.Decimal(aff.wallet_balance);
      const now = new Date();

      if (input.status === 'APPROVED') {
        const updatedPayout = await tx.payoutRequest.update({
          where: { id: locked.id },
          data: {
            status: 'APPROVED',
            receiptRef: input.receiptRef,
            processedBy: auth.user.email,
            processedAt: now,
          },
          include: payoutInclude,
        });

        await tx.affiliate.update({
          where: { id: locked.affiliate_id },
          data: {
            totalWithdrawn: { increment: amountDec },
          },
        });

        // Funds were already deducted at WITHDRAWAL_HOLD, so net wallet delta here is 0.00
        await tx.walletLedger.create({
          data: {
            affiliateId: locked.affiliate_id,
            payoutRequestId: locked.id,
            type: 'WITHDRAWAL_PAID',
            amount: ZERO,
            balanceAfter: currentWallet,
            idempotencyKey: `payout:${locked.id}:paid`,
            note: `تم تحويل مبلغ ${amountDec.toFixed(2)} ج.م للطلب ${locked.request_code} — مرجع التحويل: ${input.receiptRef}`,
          },
        });

        return updatedPayout;
      }

      // input.status === 'REJECTED' -> Refund exact amount back to walletBalance ONCE
      const refundedWallet = currentWallet.add(amountDec);

      const updatedPayout = await tx.payoutRequest.update({
        where: { id: locked.id },
        data: {
          status: 'REJECTED',
          rejectionReason: input.rejectionReason,
          processedBy: auth.user.email,
          processedAt: now,
        },
        include: payoutInclude,
      });

      await tx.affiliate.update({
        where: { id: locked.affiliate_id },
        data: {
          walletBalance: refundedWallet,
        },
      });

      await tx.walletLedger.create({
        data: {
          affiliateId: locked.affiliate_id,
          payoutRequestId: locked.id,
          type: 'WITHDRAWAL_REFUND',
          amount: amountDec,
          balanceAfter: refundedWallet,
          idempotencyKey: `payout:${locked.id}:refund`,
          note: `رد مبلغ السحب ${amountDec.toFixed(2)} ج.م للطلب ${locked.request_code} بسبب الرفض: ${input.rejectionReason}`,
        },
      });

      return updatedPayout;
    });

    return NextResponse.json(serializeWithdrawalDTO(processedPayout));
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API PATCH /api/withdrawals/[id] error:', err);
    return NextResponse.json(
      { error: 'تعذر معالجة طلب السحب', code: 'WITHDRAWAL_PROCESS_FAILED' },
      { status: 500 }
    );
  }
}
