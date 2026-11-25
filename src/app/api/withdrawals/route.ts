import { NextRequest, NextResponse } from 'next/server';
import { Prisma, type PayoutStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { enforceRateLimit } from '@/lib/rateLimit';
import {
  normalizePayoutMethodInput,
  serializeWithdrawalDTO,
} from '@/lib/serializers';
import {
  buildPaginationMeta,
  generateWithdrawalCode,
  paginationQuerySchema,
  toMoneyNumber,
  withdrawalCreateSchema,
} from '@/lib/validators';

export const dynamic = 'force-dynamic';

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
 * GET /api/withdrawals
 * - Unauthenticated -> 401 Unauthorized
 * - MARKETER -> Paginated list of ONLY their own payout requests (strict BOLA protection)
 * - ADMIN -> Paginated list of all payout requests with optional status & marketerId filters
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'MARKETER']);

    const { searchParams } = new URL(request.url);
    const parsedQuery = paginationQuerySchema.safeParse({
      page: searchParams.get('page') ?? 1,
      limit: searchParams.get('limit') ?? 20,
      search: searchParams.get('search') ?? undefined,
    });

    const page = parsedQuery.success ? parsedQuery.data.page : 1;
    const limit = parsedQuery.success ? parsedQuery.data.limit : 20;
    const statusRaw = searchParams.get('status')?.trim().toUpperCase() as PayoutStatus | undefined;
    const validStatuses: PayoutStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
    const marketerIdFilter = searchParams.get('marketerId')?.trim();

    if (auth.user.role === 'MARKETER' && !auth.affiliate) {
      return NextResponse.json({
        data: [],
        pagination: buildPaginationMeta(0, page, limit),
      });
    }

    const where: Prisma.PayoutRequestWhereInput = {
      ...(auth.user.role === 'MARKETER'
        ? { affiliateId: auth.affiliate!.id }
        : marketerIdFilter
        ? { affiliateId: marketerIdFilter }
        : {}),
      ...(statusRaw && validStatuses.includes(statusRaw) ? { status: statusRaw } : {}),
    };

    const [total, payouts] = await Promise.all([
      prisma.payoutRequest.count({ where }),
      prisma.payoutRequest.findMany({
        where,
        include: payoutInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data: payouts.map(serializeWithdrawalDTO),
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API GET /api/withdrawals error:', err);
    return NextResponse.json(
      { error: 'تعذر تحميل طلبات السحب', code: 'WITHDRAWALS_FETCH_FAILED' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/withdrawals
 * Requires authenticated ACTIVE affiliate (`requireActiveAffiliate: true`).
 * Prevents:
 * - Negative / zero / NaN / >2-decimal amounts (Zod positiveMoneySchema -> 400)
 * - Below minimum withdrawal threshold read live from PlatformSettings
 * - TOCTOU concurrent withdrawal race conditions (SELECT ... FOR UPDATE + atomic conditional UPDATE)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['MARKETER'], {
      requireActiveAffiliate: true,
    });

    const rateLimited = await enforceRateLimit(request, {
      keyPrefix: 'withdrawals:create',
      identifier: auth.user.id,
      limit: 10,
      windowSeconds: 60,
    });
    if (rateLimited) return rateLimited;

    const rawBody = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json(
        { error: 'بيانات طلب السحب غير صالحة', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    const normalizedMethod = normalizePayoutMethodInput(rawBody.method ?? rawBody.paymentMethod);
    const parsed = withdrawalCreateSchema.safeParse({
      amount: rawBody.amount,
      method: normalizedMethod,
      accountDetails: rawBody.accountDetails,
      idempotencyKey:
        typeof rawBody.idempotencyKey === 'string' && rawBody.idempotencyKey.trim()
          ? rawBody.idempotencyKey.trim()
          : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'بيانات طلب السحب غير صالحة',
          code: 'VALIDATION_ERROR',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const affiliateId = auth.affiliate!.id;
    const amountDecimal = new Prisma.Decimal(input.amount.toFixed(2));

    const result = await prisma.$transaction(async (tx) => {
      // 1. Idempotency replay check
      if (input.idempotencyKey) {
        const existing = await tx.payoutRequest.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: payoutInclude,
        });
        if (existing) {
          return { payout: existing, replayed: true };
        }
      }

      // 2. Read live minimum withdrawal amount from DB PlatformSettings
      const settings = await tx.platformSettings.findUnique({ where: { id: 1 } });
      const minWithdrawal = settings ? toMoneyNumber(settings.minWithdrawalAmount) : 200;

      if (input.amount < minWithdrawal) {
        throw NextResponse.json(
          {
            error: `الحد الأدنى لطلب السحب هو ${minWithdrawal} ج.م`,
            code: 'BELOW_MIN_WITHDRAWAL',
            minWithdrawalAmount: minWithdrawal,
          },
          { status: 400 }
        );
      }

      // 3. Pessimistic Row-Level Lock on Affiliate
      await tx.$queryRaw`
        SELECT "id", "wallet_balance"
        FROM "affiliates"
        WHERE "id" = ${affiliateId}
        FOR UPDATE
      `;

      // 4. Atomic Conditional Debit (completely eliminates TOCTOU race conditions)
      const debitedRows = await tx.$queryRaw<Array<{ wallet_balance: string }>>`
        UPDATE "affiliates"
        SET "wallet_balance" = "wallet_balance" - ${amountDecimal.toFixed(2)}::numeric(12,2),
            "updated_at" = NOW()
        WHERE "id" = ${affiliateId}
          AND "status" = 'ACTIVE'
          AND "wallet_balance" >= ${amountDecimal.toFixed(2)}::numeric(12,2)
        RETURNING "wallet_balance"::text
      `;

      if (debitedRows.length === 0) {
        throw NextResponse.json(
          {
            error: 'رصيد المحفظة المتاح أقل من المبلغ المطلوب سحبه',
            code: 'INSUFFICIENT_BALANCE',
          },
          { status: 400 }
        );
      }

      const newWalletBalance = new Prisma.Decimal(debitedRows[0].wallet_balance);

      // 5. Create PayoutRequest with collision-proof code
      const payout = await tx.payoutRequest.create({
        data: {
          requestCode: generateWithdrawalCode(),
          affiliateId,
          amount: amountDecimal,
          method: input.method,
          accountDetails: input.accountDetails,
          status: 'PENDING',
          idempotencyKey: input.idempotencyKey ?? null,
        },
        include: payoutInclude,
      });

      // 6. Immutable WalletLedger Hold Entry
      await tx.walletLedger.create({
        data: {
          affiliateId,
          payoutRequestId: payout.id,
          type: 'WITHDRAWAL_HOLD',
          amount: amountDecimal.neg(),
          balanceAfter: newWalletBalance,
          idempotencyKey: `payout:${payout.id}:hold`,
          note: `حجز مبلغ سحب للطلب ${payout.requestCode} (${input.method})`,
        },
      });

      return { payout, replayed: false };
    });

    return NextResponse.json(serializeWithdrawalDTO(result.payout), {
      status: result.replayed ? 200 : 201,
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'تم تسجيل طلب السحب هذا مسبقاً', code: 'DUPLICATE_PAYOUT' },
        { status: 409 }
      );
    }
    console.error('API POST /api/withdrawals error:', err);
    return NextResponse.json(
      { error: 'تعذر إنشاء طلب السحب', code: 'WITHDRAWAL_CREATE_FAILED' },
      { status: 500 }
    );
  }
}
