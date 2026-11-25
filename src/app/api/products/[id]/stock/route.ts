import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { serializeProductDTO } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

const stockEndpointSchema = z.union([
  z.object({
    mode: z.literal('set'),
    variantId: z.string().trim().min(1),
    stock: z.coerce.number().int().min(0).max(100000),
  }),
  z.object({
    mode: z.literal('delta'),
    variantId: z.string().trim().min(1),
    delta: z.coerce.number().int().min(-10000).max(10000),
  }),
  z.object({
    stock: z.coerce.number().int('المخزون يجب أن يكون عدداً صحيحاً').min(0, 'المخزون لا يمكن أن يكون سالباً').max(100000),
  }),
]);

/**
 * PATCH /api/products/[id]/stock
 * ADMIN-only dedicated atomic inventory update endpoint.
 * Supports:
 * - Variant-level atomic set/delta (`{ mode: 'set' | 'delta', variantId, stock | delta }`)
 * - Product aggregate stock update (`{ stock }`) distributed cleanly across active variants inside a transaction
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request, ['ADMIN']);

    const rawBody = await request.json().catch(() => null);
    const parsed = stockEndpointSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'قيمة المخزون غير صالحة',
          code: 'VALIDATION_ERROR',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findFirst({
        where: { id: params.id, archivedAt: null },
        include: { variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] } },
      });

      if (!existing) {
        throw NextResponse.json(
          { error: 'المنتج غير موجود', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      if ('mode' in input && input.mode === 'set') {
        const res = await tx.productVariant.updateMany({
          where: { id: input.variantId, productId: existing.id },
          data: { stock: input.stock },
        });
        if (res.count === 0) {
          throw NextResponse.json(
            { error: 'المتغير المحدد غير موجود', code: 'VARIANT_NOT_FOUND' },
            { status: 404 }
          );
        }
      } else if ('mode' in input && input.mode === 'delta') {
        const rows = await tx.$queryRaw<Array<{ id: string; stock: number }>>`
          UPDATE "product_variants"
          SET "stock" = "stock" + ${input.delta}
          WHERE "id" = ${input.variantId}
            AND "product_id" = ${existing.id}
            AND ("stock" + ${input.delta}) >= 0
          RETURNING "id", "stock"
        `;
        if (rows.length === 0) {
          throw NextResponse.json(
            {
              error: 'تعذر تعديل المخزون — المتغير غير موجود أو الكمية ستصبح سالبة',
              code: 'INSUFFICIENT_STOCK',
            },
            { status: 409 }
          );
        }
      } else {
        // Aggregate stock update distributed evenly across active variants (row-locked in sorted order)
        const activeVariants = existing.variants.filter((v) => v.isActive);
        const targets = activeVariants.length > 0 ? activeVariants : existing.variants;
        const targetIds = targets.map((v) => v.id).sort();

        if (targetIds.length > 0) {
          await tx.$queryRaw`
            SELECT "id" FROM "product_variants"
            WHERE "id" = ANY(${targetIds}::text[])
            ORDER BY "id" ASC
            FOR UPDATE
          `;

          const base = Math.floor(input.stock / targetIds.length);
          let rem = input.stock % targetIds.length;
          for (const vid of targetIds) {
            const nextStock = base + (rem > 0 ? 1 : 0);
            if (rem > 0) rem--;
            await tx.productVariant.update({
              where: { id: vid },
              data: { stock: nextStock },
            });
          }
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id: existing.id },
        include: { variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] } },
      });
    });

    return NextResponse.json(serializeProductDTO(updated, { includeCostPrice: true }));
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API PATCH /api/products/[id]/stock error:', err);
    return NextResponse.json(
      { error: 'تعذر تحديث المخزون', code: 'STOCK_UPDATE_FAILED' },
      { status: 500 }
    );
  }
}
