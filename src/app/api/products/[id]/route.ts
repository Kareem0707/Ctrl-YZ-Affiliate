import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getVerifiedAuthContext, requireAuth } from '@/lib/auth/session';
import { serializeProductDTO } from '@/lib/serializers';
import {
  generateVariantSku,
  productStockPatchSchema,
  productUpdateSchema,
  toMoneyNumber,
} from '@/lib/validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getVerifiedAuthContext(request).catch(() => null);
    const isAdmin = auth?.user.role === 'ADMIN';

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: params.id }, { slug: params.id }],
        archivedAt: null,
        ...(isAdmin ? {} : { isActive: true }),
      },
      include: {
        variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'المنتج غير موجود', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeProductDTO(product, { includeCostPrice: isAdmin }));
  } catch (error) {
    console.error('API GET /api/products/[id] error:', error);
    return NextResponse.json(
      { error: 'تعذر تحميل تفاصيل المنتج', code: 'PRODUCT_FETCH_FAILED' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/products/[id]
 * ADMIN-only:
 * - Atomic variant stock update (`{ mode: 'set' | 'delta', variantId, stock | delta }`)
 * - Or partial product update enforcing merged price invariants (`cost <= wholesale <= min <= suggested`)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request, ['ADMIN']);

    const rawBody = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json(
        { error: 'بيانات التحديث غير صالحة', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    const existing = await prisma.product.findFirst({
      where: { id: params.id, archivedAt: null },
      include: { variants: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'المنتج غير موجود', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Mode 1: Atomic single-variant stock update
    if (rawBody.mode === 'set' || rawBody.mode === 'delta') {
      const parsedStock = productStockPatchSchema.safeParse(rawBody);
      if (!parsedStock.success) {
        return NextResponse.json(
          {
            error: parsedStock.error.issues[0]?.message || 'بيانات تعديل المخزون غير صالحة',
            code: 'VALIDATION_ERROR',
            issues: parsedStock.error.issues,
          },
          { status: 400 }
        );
      }

      const patch = parsedStock.data;
      const updated = await prisma.$transaction(async (tx) => {
        if (patch.mode === 'set') {
          const res = await tx.productVariant.updateMany({
            where: { id: patch.variantId, productId: existing.id },
            data: { stock: patch.stock },
          });
          if (res.count === 0) {
            throw NextResponse.json(
              { error: 'المتغير المحدد غير موجود لهذا المنتج', code: 'VARIANT_NOT_FOUND' },
              { status: 404 }
            );
          }
        } else {
          // Atomic non-negative stock delta using conditional SQL UPDATE
          const rows = await tx.$queryRaw<Array<{ id: string; stock: number }>>`
            UPDATE "product_variants"
            SET "stock" = "stock" + ${patch.delta}
            WHERE "id" = ${patch.variantId}
              AND "product_id" = ${existing.id}
              AND ("stock" + ${patch.delta}) >= 0
            RETURNING "id", "stock"
          `;
          if (rows.length === 0) {
            throw NextResponse.json(
              {
                error: 'تعذر تعديل المخزون — المتغير غير موجود أو الكمية ستصبح أقل من صفر',
                code: 'INSUFFICIENT_STOCK',
              },
              { status: 409 }
            );
          }
        }

        return tx.product.findUniqueOrThrow({
          where: { id: existing.id },
          include: { variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] } },
        });
      });

      return NextResponse.json(serializeProductDTO(updated, { includeCostPrice: true }));
    }

    // Mode 2: Partial product metadata / pricing update with merged invariant check
    const normalized: Record<string, unknown> = {
      id: existing.id,
      ...(rawBody.slug !== undefined ? { slug: rawBody.slug } : {}),
      ...(rawBody.nameAr !== undefined || rawBody.name_ar !== undefined
        ? { nameAr: rawBody.nameAr ?? rawBody.name_ar }
        : {}),
      ...(rawBody.nameEn !== undefined || rawBody.name_en !== undefined
        ? { nameEn: rawBody.nameEn ?? rawBody.name_en }
        : {}),
      ...(rawBody.descriptionAr !== undefined || rawBody.description_ar !== undefined
        ? { descriptionAr: rawBody.descriptionAr ?? rawBody.description_ar }
        : {}),
      ...(rawBody.descriptionEn !== undefined || rawBody.description_en !== undefined
        ? { descriptionEn: rawBody.descriptionEn ?? rawBody.description_en }
        : {}),
      ...(rawBody.brand !== undefined ? { brand: rawBody.brand } : {}),
      ...(rawBody.category !== undefined ? { category: rawBody.category } : {}),
      ...(rawBody.images !== undefined ? { images: rawBody.images } : {}),
      ...(rawBody.costPrice !== undefined ? { costPrice: rawBody.costPrice } : {}),
      ...(rawBody.wholesalePrice !== undefined ? { wholesalePrice: rawBody.wholesalePrice } : {}),
      ...(rawBody.minPrice !== undefined ? { minPrice: rawBody.minPrice } : {}),
      ...(rawBody.suggestedPrice !== undefined ? { suggestedPrice: rawBody.suggestedPrice } : {}),
      ...(rawBody.salePrice !== undefined
        ? { salePrice: rawBody.salePrice === '' ? null : rawBody.salePrice }
        : {}),
      ...(rawBody.marketingDriveUrl !== undefined
        ? { marketingDriveUrl: rawBody.marketingDriveUrl || null }
        : {}),
      ...(rawBody.adCopies !== undefined ? { adCopies: rawBody.adCopies } : {}),
      ...(rawBody.isFeatured !== undefined ? { isFeatured: Boolean(rawBody.isFeatured) } : {}),
      ...(rawBody.isActive !== undefined ? { isActive: Boolean(rawBody.isActive) } : {}),
      ...(Array.isArray(rawBody.variants) ? { variants: rawBody.variants } : {}),
    };

    const parsed = productUpdateSchema.safeParse(normalized);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'بيانات تعديل المنتج غير صالحة',
          code: 'VALIDATION_ERROR',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const mergedCost = d.costPrice ?? toMoneyNumber(existing.costPrice);
    const mergedWholesale = d.wholesalePrice ?? toMoneyNumber(existing.wholesalePrice);
    const mergedMin = d.minPrice ?? toMoneyNumber(existing.minPrice);
    const mergedSuggested = d.suggestedPrice ?? toMoneyNumber(existing.suggestedPrice);
    const mergedSale =
      d.salePrice !== undefined
        ? d.salePrice
        : existing.salePrice !== null
        ? toMoneyNumber(existing.salePrice)
        : null;

    if (
      mergedCost > mergedWholesale ||
      mergedWholesale > mergedMin ||
      mergedMin > mergedSuggested ||
      (mergedSale !== null && mergedSale > mergedSuggested)
    ) {
      return NextResponse.json(
        {
          error:
            'ترتيب الأسعار غير صحيح: يجب أن يتحقق costPrice <= wholesalePrice <= minPrice <= suggestedPrice (و salePrice <= suggestedPrice)',
          code: 'PRICE_INVARIANT_VIOLATION',
        },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.id },
        data: {
          ...(d.slug !== undefined ? { slug: d.slug } : {}),
          ...(d.nameAr !== undefined ? { nameAr: d.nameAr } : {}),
          ...(d.nameEn !== undefined ? { nameEn: d.nameEn } : {}),
          ...(d.descriptionAr !== undefined ? { descriptionAr: d.descriptionAr } : {}),
          ...(d.descriptionEn !== undefined ? { descriptionEn: d.descriptionEn } : {}),
          ...(d.brand !== undefined ? { brand: d.brand } : {}),
          ...(d.category !== undefined ? { category: d.category } : {}),
          ...(d.images !== undefined ? { images: d.images } : {}),
          costPrice: new Prisma.Decimal(mergedCost.toFixed(2)),
          wholesalePrice: new Prisma.Decimal(mergedWholesale.toFixed(2)),
          minPrice: new Prisma.Decimal(mergedMin.toFixed(2)),
          suggestedPrice: new Prisma.Decimal(mergedSuggested.toFixed(2)),
          salePrice:
            mergedSale !== null ? new Prisma.Decimal(mergedSale.toFixed(2)) : null,
          ...(d.marketingDriveUrl !== undefined
            ? { marketingDriveUrl: d.marketingDriveUrl || null }
            : {}),
          ...(d.adCopies !== undefined
            ? { adCopies: d.adCopies as Prisma.InputJsonValue }
            : {}),
          ...(d.isFeatured !== undefined ? { isFeatured: d.isFeatured } : {}),
          ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
        },
      });

      if (d.variants && d.variants.length > 0) {
        const keptIds: string[] = [];
        for (const v of d.variants) {
          const upserted = await tx.productVariant.upsert({
            where: {
              productId_size_color: {
                productId: existing.id,
                size: v.size,
                color: v.color,
              },
            },
            update: {
              colorHex: v.colorHex ?? null,
              stock: v.stock,
              isActive: v.isActive,
            },
            create: {
              productId: existing.id,
              sku: v.sku || generateVariantSku(existing.slug, v.size, v.color),
              size: v.size,
              color: v.color,
              colorHex: v.colorHex ?? null,
              stock: v.stock,
              isActive: v.isActive,
            },
          });
          keptIds.push(upserted.id);
        }
        await tx.productVariant.updateMany({
          where: { productId: existing.id, id: { notIn: keptIds } },
          data: { isActive: false },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: existing.id },
        include: { variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] } },
      });
    });

    return NextResponse.json(serializeProductDTO(updated, { includeCostPrice: true }));
  } catch (err) {
    if (err instanceof NextResponse) return err;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'الرابط المختصر (slug) أو رمز المخزون (SKU) مستخدم بالفعل', code: 'DUPLICATE_RECORD' },
        { status: 409 }
      );
    }
    console.error('API PATCH /api/products/[id] error:', err);
    return NextResponse.json(
      { error: 'تعذر تعديل المنتج', code: 'PRODUCT_UPDATE_FAILED' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * ADMIN-only:
 * - Soft-deletes (`archivedAt = now(), isActive = false`) if product has historical OrderItems.
 * - Hard-deletes product + variants only if zero historical OrderItems reference it.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request, ['ADMIN']);

    const existing = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true, archivedAt: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'المنتج غير موجود', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const orderItemCount = await prisma.orderItem.count({
      where: { productId: existing.id },
    });

    if (orderItemCount > 0) {
      await prisma.$transaction([
        prisma.product.update({
          where: { id: existing.id },
          data: { isActive: false, archivedAt: new Date() },
        }),
        prisma.productVariant.updateMany({
          where: { productId: existing.id },
          data: { isActive: false },
        }),
      ]);

      return NextResponse.json({
        success: true,
        softDeleted: true,
        message: 'تم أرشفة المنتج حفاظاً على سجل الطلبات التاريخية المرتبطة به',
      });
    }

    await prisma.$transaction([
      prisma.productVariant.deleteMany({ where: { productId: existing.id } }),
      prisma.product.delete({ where: { id: existing.id } }),
    ]);

    return NextResponse.json({ success: true, softDeleted: false });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API DELETE /api/products/[id] error:', err);
    return NextResponse.json(
      { error: 'تعذر حذف المنتج', code: 'PRODUCT_DELETE_FAILED' },
      { status: 500 }
    );
  }
}
