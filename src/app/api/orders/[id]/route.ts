import { NextRequest, NextResponse } from 'next/server';
import { Prisma, type CommissionState, type OrderStatus } from '@prisma/client';
import { nanoid } from 'nanoid';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import {
  mapPrismaOrderStatus,
  normalizeOrderStatusInput,
  serializeOrderDTO,
} from '@/lib/serializers';
import {
  ALLOWED_ORDER_TRANSITIONS,
  orderStatusTransitionSchema,
} from '@/lib/validators';

export const dynamic = 'force-dynamic';

const ZERO = new Prisma.Decimal('0.00');

function decMaxZero(value: Prisma.Decimal): Prisma.Decimal {
  return value.lt(ZERO) ? ZERO : value;
}

function roundDec2(value: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

const orderInclude = {
  items: {
    include: {
      product: { select: { images: true } },
    },
  },
  affiliate: {
    select: {
      id: true,
      phone: true,
      affiliateCode: true,
      user: { select: { name: true } },
    },
  },
} satisfies Prisma.OrderInclude;

/**
 * GET /api/orders/[id]
 * Requires ADMIN or owning MARKETER (strict BOLA protection).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'MARKETER']);

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: params.id }, { orderNumber: params.id }],
      },
      include: orderInclude,
    });

    if (!order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (auth.user.role === 'MARKETER' && order.affiliateId !== auth.affiliate?.id) {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية للاطلاع على هذا الطلب', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      serializeOrderDTO(order, { includePlatformCost: auth.user.role === 'ADMIN' })
    );
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API GET /api/orders/[id] error:', err);
    return NextResponse.json(
      { error: 'تعذر تحميل تفاصيل الطلب', code: 'ORDER_FETCH_FAILED' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[id]
 * ADMIN-only strict Apparel Order Lifecycle & Return Window State Machine:
 * - Row-locks Order via SELECT ... FOR UPDATE.
 * - Enforces ALLOWED_ORDER_TRANSITIONS (409 Conflict on illegal jump).
 * - -> DELIVERED: populates deliveredAt + returnWindowEndsAt, moves commission pending -> lockedBalance
 *   (or walletBalance directly if returnWindowDays === 0) with idempotent WalletLedger.
 * - -> CANCELLED: restores unreturned variant stock & voids pendingBalance with WalletLedger.
 * - -> RETURNED / PARTIALLY_RETURNED: supports returning exact subset of items (`returnedItems`),
 *   restores exact stock, reverses exact proportional commission from active bucket (pending / locked / wallet),
 *   recalculates net order commission & platformProfit, and logs unique COMMISSION_CLAWBACK ledger entry.
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
        { error: 'بيانات تحديث الطلب غير صالحة', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    const normalizedStatus =
      rawBody.status !== undefined ? normalizeOrderStatusInput(rawBody.status) : undefined;
    if (rawBody.status !== undefined && !normalizedStatus) {
      return NextResponse.json(
        { error: 'حالة الطلب المحددة غير صالحة', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Pessimistic row lock on Order
      const lockedOrders = await tx.$queryRaw<
        Array<{ id: string; status: OrderStatus; commission_state: CommissionState }>
      >`
        SELECT "id", "status", "commission_state"
        FROM "orders"
        WHERE "id" = ${params.id} OR "order_number" = ${params.id}
        FOR UPDATE
      `;

      const lockedHeader = lockedOrders[0];
      if (!lockedHeader) {
        throw NextResponse.json(
          { error: 'الطلب غير موجود', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      const order = await tx.order.findUniqueOrThrow({
        where: { id: lockedHeader.id },
        include: orderInclude,
      });

      const targetStatus: OrderStatus = normalizedStatus ?? order.status;
      const isStatusChanging = targetStatus !== order.status;

      // Validate full transition payload via Zod when status changes or returnedItems supplied
      const parsedPayload = orderStatusTransitionSchema.safeParse({
        status: targetStatus,
        shippingCompany:
          typeof rawBody.shippingCompany === 'string' ? rawBody.shippingCompany : undefined,
        trackingNumber:
          typeof rawBody.trackingNumber === 'string' ? rawBody.trackingNumber : undefined,
        note:
          typeof rawBody.note === 'string'
            ? rawBody.note
            : typeof rawBody.statusNotes === 'string'
            ? rawBody.statusNotes
            : undefined,
        returnedItems: Array.isArray(rawBody.returnedItems)
          ? rawBody.returnedItems
          : undefined,
      });

      if (!parsedPayload.success) {
        throw NextResponse.json(
          {
            error: parsedPayload.error.issues[0]?.message || 'بيانات تحديث الحالة غير صالحة',
            code: 'VALIDATION_ERROR',
            issues: parsedPayload.error.issues,
          },
          { status: 400 }
        );
      }

      const input = parsedPayload.data;

      // Allow repeated PARTIALLY_RETURNED batches on an already PARTIALLY_RETURNED order
      const isAdditionalPartialReturn =
        order.status === 'PARTIALLY_RETURNED' &&
        targetStatus === 'PARTIALLY_RETURNED' &&
        Boolean(input.returnedItems && input.returnedItems.length > 0);

      if (isStatusChanging) {
        const allowedNext = ALLOWED_ORDER_TRANSITIONS[order.status] ?? [];
        if (!allowedNext.includes(targetStatus)) {
          throw NextResponse.json(
            {
              error: `انتقال الحالة غير مسموح به من ${order.status} إلى ${targetStatus}`,
              code: 'INVALID_STATE_TRANSITION',
              currentStatus: order.status,
              requestedStatus: targetStatus,
              allowedTransitions: allowedNext,
            },
            { status: 409 }
          );
        }
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const existingHistory = Array.isArray(order.statusHistory)
        ? ([...(order.statusHistory as unknown[])] as Array<Record<string, unknown>>)
        : [];

      let finalStatus: OrderStatus = targetStatus;
      let nextCommissionState: CommissionState = order.commissionState;
      let deliveredAt = order.deliveredAt;
      let returnWindowEndsAt = order.returnWindowEndsAt;
      let nextSubtotal = order.subtotal;
      let nextTotalAmount = order.totalAmount;
      let nextTotalWholesale = order.totalWholesale;
      let nextTotalCommission = order.totalCommission;
      let nextPlatformProfit = order.platformProfit;

      // ─── TRANSITION A: -> DELIVERED ───────────────────────────────
      if (isStatusChanging && targetStatus === 'DELIVERED') {
        const settings = await tx.platformSettings.findUnique({ where: { id: 1 } });
        const returnWindowDays = settings?.returnWindowDays ?? 7;

        deliveredAt = now;
        returnWindowEndsAt = new Date(now.getTime() + returnWindowDays * 24 * 60 * 60 * 1000);

        if (order.affiliateId && order.totalCommission.gt(ZERO) && order.commissionState === 'PENDING') {
          const affRows = await tx.$queryRaw<
            Array<{
              id: string;
              wallet_balance: string;
              pending_balance: string;
              locked_balance: string;
              total_earned: string;
            }>
          >`
            SELECT "id", "wallet_balance"::text, "pending_balance"::text, "locked_balance"::text, "total_earned"::text
            FROM "affiliates"
            WHERE "id" = ${order.affiliateId}
            FOR UPDATE
          `;

          if (affRows[0]) {
            const curWallet = new Prisma.Decimal(affRows[0].wallet_balance);
            const curPending = new Prisma.Decimal(affRows[0].pending_balance);
            const curLocked = new Prisma.Decimal(affRows[0].locked_balance);
            const curEarned = new Prisma.Decimal(affRows[0].total_earned);
            const comm = order.totalCommission;

            if (returnWindowDays === 0) {
              const newWallet = curWallet.add(comm);
              await tx.affiliate.update({
                where: { id: order.affiliateId },
                data: {
                  pendingBalance: decMaxZero(curPending.sub(comm)),
                  walletBalance: newWallet,
                  totalEarned: curEarned.add(comm),
                },
              });
              nextCommissionState = 'AVAILABLE';

              await tx.walletLedger.create({
                data: {
                  affiliateId: order.affiliateId,
                  orderId: order.id,
                  type: 'COMMISSION_RELEASED',
                  amount: comm,
                  balanceAfter: newWallet,
                  idempotencyKey: `order:${order.id}:released`,
                  note: `تحرير فوري لعمولة الطلب ${order.orderNumber} (فترة الاسترجاع 0 يوم)`,
                },
              });
            } else {
              await tx.affiliate.update({
                where: { id: order.affiliateId },
                data: {
                  pendingBalance: decMaxZero(curPending.sub(comm)),
                  lockedBalance: curLocked.add(comm),
                },
              });
              nextCommissionState = 'LOCKED_RETURN_WINDOW';

              await tx.walletLedger.create({
                data: {
                  affiliateId: order.affiliateId,
                  orderId: order.id,
                  type: 'COMMISSION_LOCKED',
                  amount: comm,
                  balanceAfter: curWallet,
                  idempotencyKey: `order:${order.id}:locked`,
                  note: `قفل عمولة الطلب ${order.orderNumber} لمدة ${returnWindowDays} أيام (فترة الاسترجاع)`,
                },
              });
            }
          }
        }
      }

      // ─── TRANSITION B: -> CANCELLED (pre-delivery) ────────────────
      if (isStatusChanging && targetStatus === 'CANCELLED') {
        // Restore stock for all unreturned items
        const restoreMap = new Map<string, number>();
        for (const item of order.items) {
          const unreturned = Math.max(0, item.quantity - item.returnedQuantity);
          if (item.variantId && unreturned > 0) {
            restoreMap.set(item.variantId, (restoreMap.get(item.variantId) ?? 0) + unreturned);
          }
        }

        const sortedVariantIds = Array.from(restoreMap.keys()).sort();
        if (sortedVariantIds.length > 0) {
          await tx.$queryRaw`
            SELECT "id" FROM "product_variants"
            WHERE "id" = ANY(${sortedVariantIds}::text[])
            ORDER BY "id" ASC
            FOR UPDATE
          `;
          for (const variantId of sortedVariantIds) {
            await tx.productVariant.update({
              where: { id: variantId },
              data: { stock: { increment: restoreMap.get(variantId)! } },
            });
          }
        }

        // Void pending commission atomically
        if (order.affiliateId && order.totalCommission.gt(ZERO) && order.commissionState === 'PENDING') {
          const affRows = await tx.$queryRaw<
            Array<{ id: string; wallet_balance: string; pending_balance: string }>
          >`
            SELECT "id", "wallet_balance"::text, "pending_balance"::text
            FROM "affiliates"
            WHERE "id" = ${order.affiliateId}
            FOR UPDATE
          `;

          if (affRows[0]) {
            const curWallet = new Prisma.Decimal(affRows[0].wallet_balance);
            const curPending = new Prisma.Decimal(affRows[0].pending_balance);

            await tx.affiliate.update({
              where: { id: order.affiliateId },
              data: {
                pendingBalance: decMaxZero(curPending.sub(order.totalCommission)),
              },
            });

            nextCommissionState = 'VOIDED';
            await tx.walletLedger.create({
              data: {
                affiliateId: order.affiliateId,
                orderId: order.id,
                type: 'COMMISSION_VOIDED',
                amount: order.totalCommission.neg(),
                balanceAfter: curWallet,
                idempotencyKey: `order:${order.id}:voided`,
                note: `إلغاء العمولة المعلقة بسبب إلغاء الطلب ${order.orderNumber} بواسطة ${auth.user.email}`,
              },
            });
          }
        } else if (order.commissionState === 'NONE') {
          nextCommissionState = 'VOIDED';
        }
      }

      // ─── TRANSITION C: -> RETURNED or PARTIALLY_RETURNED ──────────
      if (
        (isStatusChanging && (targetStatus === 'RETURNED' || targetStatus === 'PARTIALLY_RETURNED')) ||
        isAdditionalPartialReturn
      ) {
        const itemMap = new Map(order.items.map((item) => [item.id, item]));
        const returnQtyByItemId = new Map<string, number>();

        if (targetStatus === 'PARTIALLY_RETURNED') {
          const requestedItems = input.returnedItems ?? [];
          for (const ri of requestedItems) {
            const item = itemMap.get(ri.orderItemId);
            if (!item) {
              throw NextResponse.json(
                {
                  error: `العنصر المحدد (${ri.orderItemId}) لا ينتمي لهذا الطلب`,
                  code: 'INVALID_ORDER_ITEM',
                },
                { status: 400 }
              );
            }
            const accumulated = (returnQtyByItemId.get(item.id) ?? 0) + ri.returnQuantity;
            if (accumulated <= 0 || item.returnedQuantity + accumulated > item.quantity) {
              throw NextResponse.json(
                {
                  error: `الكمية المرتجعة للمنتج "${item.productName}" تتجاوز الكمية المتبقية (${item.quantity - item.returnedQuantity})`,
                  code: 'INVALID_RETURN_QUANTITY',
                },
                { status: 400 }
              );
            }
            returnQtyByItemId.set(item.id, accumulated);
          }
        } else {
          // Full RETURNED: return all remaining unreturned quantities
          for (const item of order.items) {
            const remaining = item.quantity - item.returnedQuantity;
            if (remaining > 0) {
              returnQtyByItemId.set(item.id, remaining);
            }
          }
        }

        if (returnQtyByItemId.size === 0) {
          throw NextResponse.json(
            {
              error: 'لا توجد قطع متبقية قابلة للاسترجاع في هذا الطلب',
              code: 'NOTHING_TO_RETURN',
            },
            { status: 409 }
          );
        }

        // Restore stock atomically for returned quantities (sorted locks)
        const variantRestoreMap = new Map<string, number>();
        for (const [itemId, rQty] of Array.from(returnQtyByItemId.entries())) {
          const item = itemMap.get(itemId)!;
          if (item.variantId && rQty > 0) {
            variantRestoreMap.set(
              item.variantId,
              (variantRestoreMap.get(item.variantId) ?? 0) + rQty
            );
          }
        }

        const sortedVariantIds = Array.from(variantRestoreMap.keys()).sort();
        if (sortedVariantIds.length > 0) {
          await tx.$queryRaw`
            SELECT "id" FROM "product_variants"
            WHERE "id" = ANY(${sortedVariantIds}::text[])
            ORDER BY "id" ASC
            FOR UPDATE
          `;
          for (const variantId of sortedVariantIds) {
            await tx.productVariant.update({
              where: { id: variantId },
              data: { stock: { increment: variantRestoreMap.get(variantId)! } },
            });
          }
        }

        // Update OrderItem.returnedQuantity and calculate exact proportional commission reversal
        let batchCommissionToReverse = ZERO;
        let recomputedSubtotal = ZERO;
        let recomputedWholesale = ZERO;
        let recomputedCommission = ZERO;
        let recomputedPlatformProfit = ZERO;
        let allItemsFullyReturned = true;

        for (const item of order.items) {
          const batchReturnQty = returnQtyByItemId.get(item.id) ?? 0;
          const prevActiveQty = item.quantity - item.returnedQuantity;
          const newReturnedQty = item.returnedQuantity + batchReturnQty;
          const newActiveQty = item.quantity - newReturnedQty;

          if (newActiveQty > 0) {
            allItemsFullyReturned = false;
          }

          if (batchReturnQty > 0) {
            await tx.orderItem.update({
              where: { id: item.id },
              data: { returnedQuantity: newReturnedQty },
            });
          }

          // Exact proportional commission without multi-batch rounding drift
          const prevActiveComm =
            prevActiveQty === item.quantity
              ? item.commissionAmount
              : prevActiveQty === 0
              ? ZERO
              : roundDec2(item.commissionAmount.mul(prevActiveQty).div(item.quantity));

          const newActiveComm =
            newActiveQty === item.quantity
              ? item.commissionAmount
              : newActiveQty === 0
              ? ZERO
              : roundDec2(item.commissionAmount.mul(newActiveQty).div(item.quantity));

          if (batchReturnQty > 0) {
            batchCommissionToReverse = batchCommissionToReverse.add(
              decMaxZero(prevActiveComm.sub(newActiveComm))
            );
          }

          const newActiveQtyDec = new Prisma.Decimal(newActiveQty);
          recomputedSubtotal = recomputedSubtotal.add(item.unitPrice.mul(newActiveQtyDec));
          recomputedWholesale = recomputedWholesale.add(item.wholesalePrice.mul(newActiveQtyDec));
          recomputedCommission = recomputedCommission.add(newActiveComm);
          recomputedPlatformProfit = recomputedPlatformProfit.add(
            item.wholesalePrice.sub(item.costPrice).mul(newActiveQtyDec)
          );
        }

        finalStatus = allItemsFullyReturned ? 'RETURNED' : 'PARTIALLY_RETURNED';
        nextSubtotal = recomputedSubtotal;
        nextTotalWholesale = recomputedWholesale;
        nextTotalCommission = recomputedCommission;
        nextPlatformProfit = recomputedPlatformProfit;
        nextTotalAmount = allItemsFullyReturned
          ? ZERO
          : recomputedSubtotal.add(order.shippingFee);

        // Deduct reversed commission from whichever bucket currently holds it
        if (order.affiliateId && batchCommissionToReverse.gt(ZERO)) {
          const affRows = await tx.$queryRaw<
            Array<{
              id: string;
              wallet_balance: string;
              pending_balance: string;
              locked_balance: string;
              total_earned: string;
            }>
          >`
            SELECT "id", "wallet_balance"::text, "pending_balance"::text, "locked_balance"::text, "total_earned"::text
            FROM "affiliates"
            WHERE "id" = ${order.affiliateId}
            FOR UPDATE
          `;

          if (affRows[0]) {
            const curWallet = new Prisma.Decimal(affRows[0].wallet_balance);
            const curPending = new Prisma.Decimal(affRows[0].pending_balance);
            const curLocked = new Prisma.Decimal(affRows[0].locked_balance);
            const curEarned = new Prisma.Decimal(affRows[0].total_earned);

            let newWallet = curWallet;
            let clawbackNote = `استرداد عمولة (${finalStatus === 'RETURNED' ? 'مرتجع كامل' : 'مرتجع جزئي'}) للطلب ${order.orderNumber}`;

            if (order.commissionState === 'PENDING') {
              await tx.affiliate.update({
                where: { id: order.affiliateId },
                data: {
                  pendingBalance: decMaxZero(curPending.sub(batchCommissionToReverse)),
                },
              });
              nextCommissionState = allItemsFullyReturned ? 'VOIDED' : 'PENDING';
            } else if (order.commissionState === 'LOCKED_RETURN_WINDOW') {
              await tx.affiliate.update({
                where: { id: order.affiliateId },
                data: {
                  lockedBalance: decMaxZero(curLocked.sub(batchCommissionToReverse)),
                },
              });
              nextCommissionState = allItemsFullyReturned ? 'CLAWED_BACK' : 'LOCKED_RETURN_WINDOW';
            } else if (order.commissionState === 'AVAILABLE') {
              // Clamp at 0 to satisfy affiliates_wallet_balance_non_negative CHECK constraint, recording any shortfall
              const deductible = curWallet.lt(batchCommissionToReverse)
                ? curWallet
                : batchCommissionToReverse;
              const shortfall = batchCommissionToReverse.sub(deductible);
              newWallet = decMaxZero(curWallet.sub(deductible));

              await tx.affiliate.update({
                where: { id: order.affiliateId },
                data: {
                  walletBalance: newWallet,
                  totalEarned: decMaxZero(curEarned.sub(batchCommissionToReverse)),
                },
              });

              if (shortfall.gt(ZERO)) {
                clawbackNote += ` — تحذير: عجز غير محصّل بقيمة ${shortfall.toFixed(2)} ج.م (الرصيد سُحب مسبقاً)`;
              }
              nextCommissionState = allItemsFullyReturned ? 'CLAWED_BACK' : 'AVAILABLE';
            }

            const returnBatchId = nanoid(10);
            await tx.walletLedger.create({
              data: {
                affiliateId: order.affiliateId,
                orderId: order.id,
                type: 'COMMISSION_CLAWBACK',
                amount: batchCommissionToReverse.neg(),
                balanceAfter: newWallet,
                idempotencyKey: `order:${order.id}:return:${returnBatchId}`,
                note: clawbackNote,
              },
            });
          }
        } else if (allItemsFullyReturned && order.commissionState !== 'NONE') {
          nextCommissionState = order.commissionState === 'PENDING' ? 'VOIDED' : 'CLAWED_BACK';
        }
      }

      if (isStatusChanging || isAdditionalPartialReturn) {
        existingHistory.push({
          status: mapPrismaOrderStatus(finalStatus),
          timestamp: nowIso,
          note: input.note || `تم تحديث حالة الطلب إلى ${finalStatus}`,
        });
      }

      return tx.order.update({
        where: { id: order.id },
        data: {
          status: finalStatus,
          commissionState: nextCommissionState,
          deliveredAt,
          returnWindowEndsAt,
          subtotal: nextSubtotal,
          totalAmount: nextTotalAmount,
          totalWholesale: nextTotalWholesale,
          totalCommission: nextTotalCommission,
          platformProfit: nextPlatformProfit,
          ...(input.shippingCompany !== undefined
            ? { shippingCompany: input.shippingCompany || null }
            : {}),
          ...(input.trackingNumber !== undefined
            ? { trackingNumber: input.trackingNumber || null }
            : {}),
          ...(input.note !== undefined ? { statusNotes: input.note || null } : {}),
          statusHistory: existingHistory as Prisma.InputJsonValue,
        },
        include: orderInclude,
      });
    });

    return NextResponse.json(serializeOrderDTO(updatedOrder, { includePlatformCost: true }));
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API PATCH /api/orders/[id] error:', err);
    return NextResponse.json(
      { error: 'تعذر تحديث حالة الطلب', code: 'ORDER_UPDATE_FAILED' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/[id]
 * ADMIN-only: strictly disallows deleting orders past PENDING or linked to immutable WalletLedger entries
 * (forces using CANCELLED / RETURNED transitions to preserve FinTech auditability).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request, ['ADMIN']);

    await prisma.$transaction(async (tx) => {
      const lockedOrders = await tx.$queryRaw<Array<{ id: string; status: OrderStatus }>>`
        SELECT "id", "status"
        FROM "orders"
        WHERE "id" = ${params.id} OR "order_number" = ${params.id}
        FOR UPDATE
      `;

      const target = lockedOrders[0];
      if (!target) {
        throw NextResponse.json(
          { error: 'الطلب غير موجود', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      const ledgerCount = await tx.walletLedger.count({
        where: { orderId: target.id },
      });

      if (target.status !== 'PENDING' || ledgerCount > 0) {
        throw NextResponse.json(
          {
            error:
              'لا يمكن حذف طلب تجاوز مرحلة المراجعة أو مرتبط بسجل مالي (WalletLedger). يرجى تغيير حالته إلى ملغي (CANCELLED) أو مرتجع (RETURNED).',
            code: 'HARD_DELETE_FORBIDDEN',
          },
          { status: 409 }
        );
      }

      const items = await tx.orderItem.findMany({
        where: { orderId: target.id },
      });

      const restoreMap = new Map<string, number>();
      for (const item of items) {
        const unreturned = Math.max(0, item.quantity - item.returnedQuantity);
        if (item.variantId && unreturned > 0) {
          restoreMap.set(item.variantId, (restoreMap.get(item.variantId) ?? 0) + unreturned);
        }
      }

      const sortedVariantIds = Array.from(restoreMap.keys()).sort();
      if (sortedVariantIds.length > 0) {
        await tx.$queryRaw`
          SELECT "id" FROM "product_variants"
          WHERE "id" = ANY(${sortedVariantIds}::text[])
          ORDER BY "id" ASC
          FOR UPDATE
        `;
        for (const variantId of sortedVariantIds) {
          await tx.productVariant.update({
            where: { id: variantId },
            data: { stock: { increment: restoreMap.get(variantId)! } },
          });
        }
      }

      await tx.order.delete({ where: { id: target.id } });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API DELETE /api/orders/[id] error:', err);
    return NextResponse.json(
      { error: 'تعذر حذف الطلب', code: 'ORDER_DELETE_FAILED' },
      { status: 500 }
    );
  }
}
