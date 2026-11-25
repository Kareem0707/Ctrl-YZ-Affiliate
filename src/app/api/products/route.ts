import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';
import prisma from '@/lib/prisma';
import { getVerifiedAuthContext, requireAuth } from '@/lib/auth/session';
import { serializeProductDTO } from '@/lib/serializers';
import {
  buildPaginationMeta,
  generateVariantSku,
  paginationQuerySchema,
  productCreateSchema,
  productUpdateSchema,
  toMoneyNumber,
} from '@/lib/validators';

export const dynamic = 'force-dynamic';

function buildSlugFromName(nameEn: string, fallbackPrefix = 'prod'): string {
  const base = nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  const suffix = nanoid(6).toLowerCase();
  return base ? `${base}-${suffix}` : `${fallbackPrefix}-${suffix}`;
}

interface NormalizedVariantInput {
  id?: string;
  sku?: string;
  size: string;
  color: string;
  colorHex?: string | null;
  stock: number;
  isActive: boolean;
}

/**
 * Normalize both canonical camelCase payloads and legacy Admin UI snake_case payloads
 * before passing into strict Zod schemas.
 */
function normalizeIncomingProductPayload(raw: Record<string, unknown>, isPartial: boolean) {
  const nameAr = (raw.nameAr ?? raw.name_ar) as string | undefined;
  const nameEn = (raw.nameEn ?? raw.name_en ?? nameAr) as string | undefined;
  const descriptionAr = (raw.descriptionAr ?? raw.description_ar) as string | undefined;
  const descriptionEn = (raw.descriptionEn ?? raw.description_en ?? descriptionAr) as
    | string
    | undefined;

  let variants: NormalizedVariantInput[] | undefined;

  if (Array.isArray(raw.variants) && raw.variants.length > 0) {
    variants = raw.variants.map((v: any) => ({
      id: typeof v.id === 'string' ? v.id : undefined,
      sku: typeof v.sku === 'string' ? v.sku : undefined,
      size: String(v.size || 'M').trim(),
      color: String(v.color || 'Jet Black').trim(),
      colorHex: typeof v.colorHex === 'string' ? v.colorHex : null,
      stock: Math.max(0, Math.floor(Number(v.stock ?? 0))),
      isActive: v.isActive !== false,
    }));
  } else if (!isPartial || Array.isArray(raw.sizes) || Array.isArray(raw.colors)) {
    const sizes =
      Array.isArray(raw.sizes) && raw.sizes.length > 0
        ? raw.sizes.map((s) => String(s).trim()).filter(Boolean)
        : !isPartial
        ? ['M', 'L', 'XL', '2XL']
        : undefined;

    const colors =
      Array.isArray(raw.colors) && raw.colors.length > 0
        ? raw.colors.map((c: any) =>
            typeof c === 'string'
              ? { name: c.trim(), hex: '#111827' }
              : { name: String(c?.name || 'Jet Black').trim(), hex: String(c?.hex || '#111827') }
          )
        : !isPartial
        ? [{ name: 'Jet Black', hex: '#111827' }]
        : undefined;

    if (sizes && colors) {
      const totalStock = Math.max(0, Math.floor(Number(raw.stock ?? 50)));
      const combos = sizes.length * colors.length;
      const basePerVariant = Math.floor(totalStock / Math.max(1, combos));
      let remainder = totalStock % Math.max(1, combos);
      variants = [];
      for (const color of colors) {
        for (const size of sizes) {
          const stock = basePerVariant + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;
          variants.push({
            size,
            color: color.name,
            colorHex: color.hex,
            stock,
            isActive: true,
          });
        }
      }
    }
  }

  const cleaned: Record<string, unknown> = {
    ...(raw.id !== undefined ? { id: raw.id } : {}),
    ...(raw.slug !== undefined ? { slug: raw.slug } : {}),
    ...(nameAr !== undefined ? { nameAr } : {}),
    ...(nameEn !== undefined ? { nameEn } : {}),
    ...(descriptionAr !== undefined
      ? { descriptionAr: descriptionAr.trim() || 'منتج Ctrl YZ أصلي عالي الجودة' }
      : {}),
    ...(descriptionEn !== undefined
      ? { descriptionEn: descriptionEn.trim() || 'Authentic Ctrl YZ Apparel' }
      : {}),
    ...(raw.brand !== undefined ? { brand: raw.brand } : {}),
    ...(raw.category !== undefined ? { category: raw.category } : {}),
    ...(raw.images !== undefined ? { images: raw.images } : {}),
    ...(raw.costPrice !== undefined ? { costPrice: raw.costPrice } : {}),
    ...(raw.wholesalePrice !== undefined ? { wholesalePrice: raw.wholesalePrice } : {}),
    ...(raw.minPrice !== undefined ? { minPrice: raw.minPrice } : {}),
    ...(raw.suggestedPrice !== undefined ? { suggestedPrice: raw.suggestedPrice } : {}),
    ...(raw.salePrice !== undefined ? { salePrice: raw.salePrice === '' ? null : raw.salePrice } : {}),
    ...(raw.marketingDriveUrl !== undefined
      ? { marketingDriveUrl: raw.marketingDriveUrl || null }
      : {}),
    ...(raw.adCopies !== undefined ? { adCopies: raw.adCopies } : {}),
    ...(raw.isFeatured !== undefined ? { isFeatured: Boolean(raw.isFeatured) } : {}),
    ...(raw.isActive !== undefined ? { isActive: Boolean(raw.isActive) } : {}),
    ...(variants !== undefined ? { variants } : {}),
  };

  return cleaned;
}

function validateMergedPricingHierarchy(pricing: {
  costPrice: number;
  wholesalePrice: number;
  minPrice: number;
  suggestedPrice: number;
  salePrice: number | null;
}): string | null {
  if (pricing.costPrice > pricing.wholesalePrice) {
    return 'سعر الجملة للمسوق يجب أن يكون أكبر من أو يساوي تكلفة المنصة (costPrice <= wholesalePrice)';
  }
  if (pricing.wholesalePrice > pricing.minPrice) {
    return 'الحد الأدنى للبيع يجب أن يكون أكبر من أو يساوي سعر الجملة (wholesalePrice <= minPrice)';
  }
  if (pricing.minPrice > pricing.suggestedPrice) {
    return 'سعر البيع المقترح يجب أن يكون أكبر من أو يساوي الحد الأدنى للبيع (minPrice <= suggestedPrice)';
  }
  if (pricing.salePrice !== null && pricing.salePrice > pricing.suggestedPrice) {
    return 'سعر التخفيض لا يمكن أن يتجاوز سعر البيع المقترح';
  }
  return null;
}

/**
 * GET /api/products
 * Paginated catalog endpoint backed by Neon PostgreSQL + Prisma.
 * Public callers see only active, non-archived products (without sensitive costPrice).
 * ADMIN callers may pass ?includeInactive=true and receive full costPrice.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getVerifiedAuthContext(request).catch(() => null);
    const isAdmin = auth?.user.role === 'ADMIN';

    const { searchParams } = new URL(request.url);
    const parsedQuery = paginationQuerySchema.safeParse({
      page: searchParams.get('page') ?? 1,
      limit: searchParams.get('limit') ?? 20,
      search: searchParams.get('search') ?? undefined,
    });

    const page = parsedQuery.success ? parsedQuery.data.page : 1;
    const limit = parsedQuery.success ? parsedQuery.data.limit : 20;
    const search = parsedQuery.success ? parsedQuery.data.search : undefined;
    const category = searchParams.get('category')?.trim();
    const includeInactive = isAdmin && searchParams.get('includeInactive') === 'true';

    const where: Prisma.ProductWhereInput = {
      archivedAt: null,
      ...(includeInactive ? {} : { isActive: true }),
      ...(category && category.toLowerCase() !== 'all'
        ? { category: { equals: category, mode: 'insensitive' } }
        : {}),
      ...(search
        ? {
            OR: [
              { nameAr: { contains: search, mode: 'insensitive' } },
              { nameEn: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          variants: {
            orderBy: [{ color: 'asc' }, { size: 'asc' }],
          },
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data = products.map((p) =>
      serializeProductDTO(p, { includeCostPrice: isAdmin })
    );

    return NextResponse.json({
      data,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error('API GET /api/products error:', error);
    return NextResponse.json(
      { error: 'تعذر تحميل قائمة المنتجات', code: 'PRODUCTS_FETCH_FAILED' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * ADMIN-only creation (or legacy upsert when `id` is supplied) with strict Zod
 * price invariant validation (`costPrice <= wholesalePrice <= minPrice <= suggestedPrice`).
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, ['ADMIN']);

    const rawBody = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json(
        { error: 'بيانات المنتج غير صالحة', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    // Support Admin UI editing via POST with `id` (also available via PATCH /api/products/[id])
    if (typeof rawBody.id === 'string' && rawBody.id.trim().length > 0) {
      const productId = rawBody.id.trim();
      const existing = await prisma.product.findFirst({
        where: { id: productId, archivedAt: null },
        include: { variants: true },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'المنتج غير موجود', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      const normalized = normalizeIncomingProductPayload(rawBody, true);
      const parsed = productUpdateSchema.safeParse({ ...normalized, id: productId });
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: parsed.error.issues[0]?.message || 'بيانات تحديث المنتج غير صالحة',
            code: 'VALIDATION_ERROR',
            issues: parsed.error.issues,
          },
          { status: 400 }
        );
      }

      const d = parsed.data;
      const mergedPricing = {
        costPrice: d.costPrice ?? toMoneyNumber(existing.costPrice),
        wholesalePrice: d.wholesalePrice ?? toMoneyNumber(existing.wholesalePrice),
        minPrice: d.minPrice ?? toMoneyNumber(existing.minPrice),
        suggestedPrice: d.suggestedPrice ?? toMoneyNumber(existing.suggestedPrice),
        salePrice:
          d.salePrice !== undefined
            ? d.salePrice
            : existing.salePrice !== null
            ? toMoneyNumber(existing.salePrice)
            : null,
      };

      const hierarchyError = validateMergedPricingHierarchy(mergedPricing);
      if (hierarchyError) {
        return NextResponse.json(
          { error: hierarchyError, code: 'PRICE_INVARIANT_VIOLATION' },
          { status: 400 }
        );
      }

      const rawTotalStock =
        rawBody.stock !== undefined && !Array.isArray(rawBody.variants)
          ? Math.max(0, Math.floor(Number(rawBody.stock)))
          : undefined;

      const updated = await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: existing.id },
          data: {
            ...(d.nameAr !== undefined ? { nameAr: d.nameAr } : {}),
            ...(d.nameEn !== undefined ? { nameEn: d.nameEn } : {}),
            ...(d.descriptionAr !== undefined ? { descriptionAr: d.descriptionAr } : {}),
            ...(d.descriptionEn !== undefined ? { descriptionEn: d.descriptionEn } : {}),
            ...(d.brand !== undefined ? { brand: d.brand } : {}),
            ...(d.category !== undefined ? { category: d.category } : {}),
            ...(d.images !== undefined ? { images: d.images } : {}),
            costPrice: new Prisma.Decimal(mergedPricing.costPrice.toFixed(2)),
            wholesalePrice: new Prisma.Decimal(mergedPricing.wholesalePrice.toFixed(2)),
            minPrice: new Prisma.Decimal(mergedPricing.minPrice.toFixed(2)),
            suggestedPrice: new Prisma.Decimal(mergedPricing.suggestedPrice.toFixed(2)),
            salePrice:
              mergedPricing.salePrice !== null
                ? new Prisma.Decimal(mergedPricing.salePrice.toFixed(2))
                : null,
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
          const keptVariantIds: string[] = [];
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
            keptVariantIds.push(upserted.id);
          }

          await tx.productVariant.updateMany({
            where: {
              productId: existing.id,
              id: { notIn: keptVariantIds },
            },
            data: { isActive: false },
          });
        } else if (rawTotalStock !== undefined && existing.variants.length > 0) {
          // Admin adjusted aggregate stock directly in inventory table -> distribute across active variants
          const activeVars = existing.variants.filter((v) => v.isActive);
          const targets = activeVars.length > 0 ? activeVars : existing.variants;
          const base = Math.floor(rawTotalStock / targets.length);
          let rem = rawTotalStock % targets.length;
          for (const v of targets) {
            const nextStock = base + (rem > 0 ? 1 : 0);
            if (rem > 0) rem--;
            await tx.productVariant.update({
              where: { id: v.id },
              data: { stock: nextStock },
            });
          }
        }

        return tx.product.findUniqueOrThrow({
          where: { id: existing.id },
          include: { variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] } },
        });
      });

      return NextResponse.json(serializeProductDTO(updated, { includeCostPrice: true }));
    }

    // Create new product
    const normalized = normalizeIncomingProductPayload(rawBody, false);
    const parsed = productCreateSchema.safeParse(normalized);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'بيانات المنتج الجديد غير صالحة',
          code: 'VALIDATION_ERROR',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const slug = d.slug || buildSlugFromName(d.nameEn);

    const created = await prisma.$transaction(async (tx) => {
      return tx.product.create({
        data: {
          slug,
          nameAr: d.nameAr,
          nameEn: d.nameEn,
          descriptionAr: d.descriptionAr,
          descriptionEn: d.descriptionEn,
          brand: d.brand,
          category: d.category,
          images: d.images,
          costPrice: new Prisma.Decimal(d.costPrice.toFixed(2)),
          wholesalePrice: new Prisma.Decimal(d.wholesalePrice.toFixed(2)),
          minPrice: new Prisma.Decimal(d.minPrice.toFixed(2)),
          suggestedPrice: new Prisma.Decimal(d.suggestedPrice.toFixed(2)),
          salePrice:
            d.salePrice !== undefined && d.salePrice !== null
              ? new Prisma.Decimal(d.salePrice.toFixed(2))
              : null,
          marketingDriveUrl: d.marketingDriveUrl || null,
          adCopies: d.adCopies ? (d.adCopies as Prisma.InputJsonValue) : Prisma.JsonNull,
          isFeatured: d.isFeatured,
          isActive: d.isActive,
          variants: {
            create: d.variants.map((v) => ({
              sku: v.sku || generateVariantSku(slug, v.size, v.color),
              size: v.size,
              color: v.color,
              colorHex: v.colorHex ?? null,
              stock: v.stock,
              isActive: v.isActive,
            })),
          },
        },
        include: {
          variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] },
        },
      });
    });

    return NextResponse.json(serializeProductDTO(created, { includeCostPrice: true }), {
      status: 201,
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'الرابط المختصر (slug) أو رمز المخزون (SKU) مستخدم بالفعل', code: 'DUPLICATE_RECORD' },
        { status: 409 }
      );
    }
    console.error('API POST /api/products error:', err);
    return NextResponse.json(
      { error: 'تعذر حفظ المنتج', code: 'PRODUCT_SAVE_FAILED' },
      { status: 500 }
    );
  }
}
