import { NextRequest, NextResponse } from 'next/server';
import { Prisma, type OrderStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getVerifiedAuthContext, requireAuth } from '@/lib/auth/session';
import { enforceRateLimit } from '@/lib/rateLimit';
import {
  normalizeEgyptianPhone,
  normalizeOrderStatusInput,
  serializeOrderDTO,
  serializePublicOrderTrackingDTO,
} from '@/lib/serializers';
import {
  asciiAffiliateCodeSchema,
  buildPaginationMeta,
  egyptianPhoneSchema,
  generateOrderNumber,
  orderSourceSchema,
  paginationQuerySchema,
  positiveMoneySchema,
} from '@/lib/validators';

export const dynamic = 'force-dynamic';

const ZERO = new Prisma.Decimal('0.00');

function decMaxZero(value: Prisma.Decimal): Prisma.Decimal {
  return value.lt(ZERO) ? ZERO : value;
}

const strictOrderItemSchema = z.object({
  productId: z.string().trim().min(1, 'معرف المنتج مطلوب'),
  variantId: z.string().trim().min(1).optional(),
  size: z.string().trim().min(1, 'المقاس مطلوب').max(24),
  color: z.string().trim().max(40).optional().default(''),
  quantity: z.coerce
    .number()
    .int('الكمية يجب أن تكون عدداً صحيحاً')
    .min(1, 'الكمية يجب أن تكون 1 على الأقل')
    .max(50, 'الحد الأقصى للقطعة الواحدة 50'),
  customUnitPrice: positiveMoneySchema.optional(),
});

const strictOrderCreateSchema = z.object({
  source: orderSourceSchema.default('STOREFRONT'),
  affiliateCode: asciiAffiliateCodeSchema.optional(),
  customerName: z.string().trim().min(3, 'اسم العميل يجب ألا يقل عن 3 أحرف').max(120),
  customerPhone: egyptianPhoneSchema,
  customerAltPhone: egyptianPhoneSchema.optional().or(z.literal('')),
  governorate: z.string().trim().min(2, 'المحافظة مطلوبة').max(80),
  customerCity: z.string().trim().max(100).optional(),
  customerAddress: z.string().trim().min(6, 'العنوان التفصيلي مطلوب (6 أحرف على الأقل)').max(400),
  notes: z.string().trim().max(500).optional(),
  items: z
    .array(strictOrderItemSchema)
    .min(1, 'يجب أن يحتوي الطلب على منتج واحد على الأقل')
    .max(20),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

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
 * GET /api/orders
 * - ?orderNumber=ORD-... -> Public sanitized tracking view (or full DTO for ADMIN / owning MARKETER)
 * - Authenticated MARKETER -> Paginated list of ONLY their own orders (strict BOLA protection)
 * - Authenticated ADMIN -> Paginated list of all orders with status/affiliate/search filters
 * - Unauthenticated without orderNumber -> 401 Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber')?.trim();

    if (orderNumber) {
      const auth = await getVerifiedAuthContext(request).catch(() => null);
      const order = await prisma.order.findFirst({
        where: {
          orderNumber: { equals: orderNumber.toUpperCase(), mode: 'insensitive' },
        },
        include: orderInclude,
      });

      if (!order) {
        return NextResponse.json(
          { error: 'لم يتم العثور على طلب بهذا الرقم', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      if (auth?.user.role === 'ADMIN') {
        return NextResponse.json(serializeOrderDTO(order, { includePlatformCost: true }));
      }
      if (auth?.affiliate && order.affiliateId === auth.affiliate.id) {
        return NextResponse.json(serializeOrderDTO(order, { includePlatformCost: false }));
      }

      return NextResponse.json(serializePublicOrderTrackingDTO(order));
    }

    const auth = await requireAuth(request, ['ADMIN', 'MARKETER']);

    const parsedQuery = paginationQuerySchema.safeParse({
      page: searchParams.get('page') ?? 1,
      limit: searchParams.get('limit') ?? 20,
      search: searchParams.get('search') ?? undefined,
    });

    const page = parsedQuery.success ? parsedQuery.data.page : 1;
    const limit = parsedQuery.success ? parsedQuery.data.limit : 20;
    const search = parsedQuery.success ? parsedQuery.data.search : undefined;
    const statusParam = normalizeOrderStatusInput(searchParams.get('status'));
    const affiliateFilter = searchParams.get('affiliateId')?.trim();

    if (auth.user.role === 'MARKETER' && !auth.affiliate) {
      return NextResponse.json({
        data: [],
        pagination: buildPaginationMeta(0, page, limit),
      });
    }

    const where: Prisma.OrderWhereInput = {
      ...(auth.user.role === 'MARKETER'
        ? { affiliateId: auth.affiliate!.id }
        : affiliateFilter
        ? { affiliateId: affiliateFilter }
        : {}),
      ...(statusParam ? { status: statusParam as OrderStatus } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { customerPhone: { contains: search } },
              { trackingNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const includeCost = auth.user.role === 'ADMIN';
    return NextResponse.json({
      data: orders.map((o) => serializeOrderDTO(o, { includePlatformCost: includeCost })),
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API GET /api/orders error:', err);
    return NextResponse.json(
      { error: 'تعذر تحميل الطلبات', code: 'ORDERS_FETCH_FAILED' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * 100% Server-Authoritative Order Creation:
 * - Strictly ignores any client price, wholesalePrice, commission, platformProfit, or shippingFee.
 * - Locks ProductVariant rows with SELECT ... FOR UPDATE in sorted ID order (deadlock-free).
 * - Blocks self-referral fraud (affiliate phone == customer phone or storefront self-checkout).
 * - Computes exact Decimal financials, deducts stock atomically, credits pendingBalance, and
 *   writes immutable WalletLedger entry with idempotencyKey.
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimited = await enforceRateLimit(request, {
      keyPrefix: 'orders:create',
      limit: 15,
      windowSeconds: 60,
    });
    if (rateLimited) return rateLimited;

    const rawBody = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json(
        { error: 'بيانات الطلب غير صالحة', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    // Explicitly whitelist ONLY allowed client fields (strip price/wholesale/commission/shippingFee/affiliateId)
    const whitelistedInput = {
      source: rawBody.source ?? 'STOREFRONT',
      affiliateCode:
        typeof rawBody.affiliateCode === 'string' && rawBody.affiliateCode.trim()
          ? rawBody.affiliateCode.trim().toUpperCase()
          : undefined,
      customerName: rawBody.customerName,
      customerPhone: rawBody.customerPhone,
      customerAltPhone: rawBody.customerAltPhone ?? rawBody.customerPhone2 ?? '',
      governorate: rawBody.governorate,
      customerCity:
        typeof rawBody.customerCity === 'string' && rawBody.customerCity.trim()
          ? rawBody.customerCity.trim()
          : undefined,
      customerAddress: rawBody.customerAddress,
      notes: typeof rawBody.notes === 'string' ? rawBody.notes : undefined,
      idempotencyKey:
        typeof rawBody.idempotencyKey === 'string' && rawBody.idempotencyKey.trim()
          ? rawBody.idempotencyKey.trim()
          : undefined,
      items: Array.isArray(rawBody.items)
        ? rawBody.items.map((item: any) => ({
            productId: item?.productId,
            variantId: typeof item?.variantId === 'string' ? item.variantId : undefined,
            size: item?.size,
            color: typeof item?.color === 'string' ? item.color : '',
            quantity: item?.quantity,
            // Only customUnitPrice is accepted (and only respected for AFFILIATE_DIRECT)
            customUnitPrice:
              rawBody.source === 'AFFILIATE_DIRECT'
                ? item?.customUnitPrice ?? item?.price
                : undefined,
          }))
        : [],
    };

    const parsed = strictOrderCreateSchema.safeParse(whitelistedInput);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'بيانات الطلب غير مكتملة أو غير صالحة',
          code: 'VALIDATION_ERROR',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const normalizedCustomerPhone = normalizeEgyptianPhone(input.customerPhone);
    const cookieRefCode = request.cookies.get('ctrl_ref')?.value?.trim().toUpperCase();

    // Check auth context outside transaction for AFFILIATE_DIRECT enforcement & self-referral detection
    const auth =
      input.source === 'AFFILIATE_DIRECT'
        ? await requireAuth(request, ['MARKETER', 'ADMIN'], { requireActiveAffiliate: true })
        : await getVerifiedAuthContext(request).catch(() => null);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Idempotency replay check
      if (input.idempotencyKey) {
        const existingOrder = await tx.order.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: orderInclude,
        });
        if (existingOrder) {
          return { order: existingOrder, replayed: true };
        }
      }

      // 2. Authoritative Attribution + Self-Referral Block
      let attributedAffiliate: {
        id: string;
        userId: string;
        phone: string;
        affiliateCode: string;
      } | null = null;

      if (input.source === 'AFFILIATE_DIRECT') {
        if (auth?.affiliate && auth.affiliate.status === 'ACTIVE') {
          attributedAffiliate = {
            id: auth.affiliate.id,
            userId: auth.affiliate.userId,
            phone: auth.affiliate.phone,
            affiliateCode: auth.affiliate.affiliateCode,
          };

          if (normalizeEgyptianPhone(attributedAffiliate.phone) === normalizedCustomerPhone) {
            throw NextResponse.json(
              {
                error: 'لا يمكن للمسوق تسجيل طلب عمولة مباشر لنفس رقم هاتفه الشخصي (منع الإحالة الذاتية)',
                code: 'SELF_REFERRAL_FORBIDDEN',
              },
              { status: 400 }
            );
          }
        }
      } else {
        // STOREFRONT attribution: prefer verified ctrl_ref cookie, fallback to validated affiliateCode
        const candidateCode = cookieRefCode || input.affiliateCode;
        if (candidateCode) {
          const aff = await tx.affiliate.findFirst({
            where: {
              affiliateCode: { equals: candidateCode, mode: 'insensitive' },
              status: 'ACTIVE',
            },
            select: {
              id: true,
              userId: true,
              phone: true,
              affiliateCode: true,
            },
          });

          if (aff) {
            const isSelfPhone =
              normalizeEgyptianPhone(aff.phone) === normalizedCustomerPhone;
            const isSelfUser = auth?.user.id === aff.userId;

            if (isSelfPhone || isSelfUser) {
              console.warn(
                `[Anti-Fraud] Stripped self-referral attribution for affiliate ${aff.affiliateCode} on storefront checkout.`
              );
              attributedAffiliate = null;
            } else {
              attributedAffiliate = aff;
            }
          }
        }
      }

      // 3. Authoritative Shipping Rate Lookup from DB (never trust client shippingFee)
      const shippingRate = await tx.shippingRate.findFirst({
        where: {
          isActive: true,
          OR: [
            { governorateAr: { equals: input.governorate, mode: 'insensitive' } },
            { governorateEn: { equals: input.governorate, mode: 'insensitive' } },
          ],
        },
      });

      if (!shippingRate) {
        throw NextResponse.json(
          {
            error: `المحافظة المحددة (${input.governorate}) غير مدعومة أو غير مفعلة حالياً للشحن`,
            code: 'INVALID_GOVERNORATE',
          },
          { status: 400 }
        );
      }

      const authoritativeShippingFee = shippingRate.fee;

      // 4. Load Products & Resolve Variants
      const uniqueProductIds = Array.from(new Set(input.items.map((i) => i.productId)));
      const products = await tx.product.findMany({
        where: {
          id: { in: uniqueProductIds },
          isActive: true,
          archivedAt: null,
        },
        include: {
          variants: {
            where: { isActive: true },
          },
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      interface ResolvedLine {
        product: (typeof products)[number];
        variantId: string;
        size: string;
        color: string;
        quantity: number;
        customUnitPrice?: number;
      }

      const resolvedLines: ResolvedLine[] = [];

      for (const reqItem of input.items) {
        const product = productMap.get(reqItem.productId);
        if (!product) {
          throw NextResponse.json(
            {
              error: `المنتج المطلوب (${reqItem.productId}) غير متاح حالياً أو تم إيقافه`,
              code: 'PRODUCT_UNAVAILABLE',
            },
            { status: 400 }
          );
        }

        let matchedVariant = reqItem.variantId
          ? product.variants.find((v) => v.id === reqItem.variantId)
          : undefined;

        if (!matchedVariant && reqItem.color) {
          matchedVariant = product.variants.find(
            (v) =>
              v.size.toLowerCase() === reqItem.size.toLowerCase() &&
              v.color.toLowerCase() === reqItem.color.toLowerCase()
          );
        }

        if (!matchedVariant) {
          // Fallback: match size (preferring variant with highest stock when storefront didn't specify color)
          const sameSizeVariants = product.variants
            .filter((v) => v.size.toLowerCase() === reqItem.size.toLowerCase())
            .sort((a, b) => b.stock - a.stock);
          matchedVariant = sameSizeVariants[0];
        }

        if (!matchedVariant) {
          throw NextResponse.json(
            {
              error: `المقاس/اللون المحدد (${reqItem.size}${reqItem.color ? ` / ${reqItem.color}` : ''}) غير متوفر للمنتج "${product.nameAr}"`,
              code: 'VARIANT_UNAVAILABLE',
            },
            { status: 400 }
          );
        }

        resolvedLines.push({
          product,
          variantId: matchedVariant.id,
          size: matchedVariant.size,
          color: matchedVariant.color,
          quantity: reqItem.quantity,
          customUnitPrice: reqItem.customUnitPrice,
        });
      }

      // 5. Pessimistic Row-Level Lock on ProductVariant rows in deterministic sorted order (deadlock-free)
      const requestedQtyByVariant = new Map<string, number>();
      for (const line of resolvedLines) {
        requestedQtyByVariant.set(
          line.variantId,
          (requestedQtyByVariant.get(line.variantId) ?? 0) + line.quantity
        );
      }

      const sortedVariantIds = Array.from(requestedQtyByVariant.keys()).sort();
      const lockedVariants = await tx.$queryRaw<Array<{ id: string; stock: number }>>`
        SELECT "id", "stock"
        FROM "product_variants"
        WHERE "id" = ANY(${sortedVariantIds}::text[])
        ORDER BY "id" ASC
        FOR UPDATE
      `;

      const lockedStockMap = new Map(lockedVariants.map((v) => [v.id, Number(v.stock)]));

      for (const [variantId, totalQty] of Array.from(requestedQtyByVariant.entries())) {
        const availableStock = lockedStockMap.get(variantId);
        if (availableStock === undefined || availableStock < totalQty || totalQty <= 0) {
          const sampleLine = resolvedLines.find((l) => l.variantId === variantId);
          throw NextResponse.json(
            {
              error: `المخزون غير كافٍ للمنتج "${sampleLine?.product.nameAr ?? ''}" (المتاح: ${availableStock ?? 0}، المطلوب: ${totalQty})`,
              code: 'INSUFFICIENT_STOCK',
              variantId,
              availableStock: availableStock ?? 0,
            },
            { status: 409 }
          );
        }
      }

      // 6. Compute 100% Authoritative Decimal Financials
      let subtotal = ZERO;
      let totalWholesale = ZERO;
      let totalCommission = ZERO;
      let platformProfit = ZERO;

      const orderItemsCreateData: Prisma.OrderItemCreateWithoutOrderInput[] = [];

      for (const line of resolvedLines) {
        const { product } = line;
        let unitPrice: Prisma.Decimal;

        if (input.source === 'AFFILIATE_DIRECT') {
          if (line.customUnitPrice === undefined) {
            throw NextResponse.json(
              {
                error: `يجب تحديد سعر البيع للمنتج "${product.nameAr}"`,
                code: 'CUSTOM_PRICE_REQUIRED',
              },
              { status: 400 }
            );
          }
          const proposed = new Prisma.Decimal(line.customUnitPrice.toFixed(2));
          if (proposed.lt(product.minPrice)) {
            throw NextResponse.json(
              {
                error: `سعر البيع للمنتج "${product.nameAr}" لا يمكن أن يقل عن الحد الأدنى (${product.minPrice.toFixed(2)} ج.م)`,
                code: 'PRICE_BELOW_MIN',
              },
              { status: 400 }
            );
          }
          unitPrice = proposed;
        } else {
          unitPrice = product.salePrice ?? product.suggestedPrice;
        }

        const qtyDec = new Prisma.Decimal(line.quantity);
        const lineSub = unitPrice.mul(qtyDec);
        const lineWh = product.wholesalePrice.mul(qtyDec);
        const perUnitCommission = decMaxZero(unitPrice.sub(product.wholesalePrice));
        const lineComm = attributedAffiliate ? perUnitCommission.mul(qtyDec) : ZERO;
        const linePlatformProf = product.wholesalePrice.sub(product.costPrice).mul(qtyDec);

        subtotal = subtotal.add(lineSub);
        totalWholesale = totalWholesale.add(lineWh);
        totalCommission = totalCommission.add(lineComm);
        platformProfit = platformProfit.add(linePlatformProf);

        orderItemsCreateData.push({
          product: { connect: { id: product.id } },
          variant: { connect: { id: line.variantId } },
          productName: product.nameAr,
          size: line.size,
          color: line.color,
          quantity: line.quantity,
          returnedQuantity: 0,
          unitPrice,
          wholesalePrice: product.wholesalePrice,
          costPrice: product.costPrice,
          commissionAmount: lineComm,
        });
      }

      const totalAmount = subtotal.add(authoritativeShippingFee);
      const commissionState =
        attributedAffiliate && totalCommission.gt(ZERO) ? 'PENDING' : 'NONE';

      // 7. Atomically Decrement Locked Variant Stock
      for (const [variantId, totalQty] of Array.from(requestedQtyByVariant.entries())) {
        await tx.productVariant.update({
          where: { id: variantId },
          data: { stock: { decrement: totalQty } },
        });
      }

      // 8. Create Order + OrderItems with collision-proof orderNumber
      const nowIso = new Date().toISOString();
      const createdOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          affiliateId: attributedAffiliate?.id ?? null,
          source: input.source,
          status: 'PENDING',
          commissionState,
          customerName: input.customerName,
          customerPhone: normalizedCustomerPhone,
          customerAltPhone: input.customerAltPhone ? normalizeEgyptianPhone(input.customerAltPhone) : null,
          governorate: shippingRate.governorateAr,
          customerCity: input.customerCity || shippingRate.governorateAr,
          customerAddress: input.customerAddress,
          notes: input.notes || null,
          subtotal,
          shippingFee: authoritativeShippingFee,
          totalAmount,
          totalWholesale,
          totalCommission,
          platformProfit,
          statusNotes: 'تم إنشاء الطلب بنجاح وهو قيد المراجعة والتأكيد',
          statusHistory: [
            {
              status: 'pending',
              timestamp: nowIso,
              note: 'تم تسجيل الطلب بحسابات الخادم المعتمدة وحجز المخزون',
            },
          ] as Prisma.InputJsonValue,
          idempotencyKey: input.idempotencyKey ?? null,
          items: {
            create: orderItemsCreateData,
          },
        },
        include: orderInclude,
      });

      // 9. Credit Affiliate Pending Balance + Immutable WalletLedger
      if (attributedAffiliate && totalCommission.gt(ZERO)) {
        const lockedAffRows = await tx.$queryRaw<
          Array<{ id: string; wallet_balance: string; pending_balance: string }>
        >`
          SELECT "id", "wallet_balance"::text, "pending_balance"::text
          FROM "affiliates"
          WHERE "id" = ${attributedAffiliate.id}
          FOR UPDATE
        `;

        const currentWallet = new Prisma.Decimal(lockedAffRows[0]?.wallet_balance ?? '0.00');

        await tx.affiliate.update({
          where: { id: attributedAffiliate.id },
          data: {
            pendingBalance: { increment: totalCommission },
          },
        });

        await tx.walletLedger.create({
          data: {
            affiliateId: attributedAffiliate.id,
            orderId: createdOrder.id,
            type: 'COMMISSION_PENDING',
            amount: totalCommission,
            balanceAfter: currentWallet,
            idempotencyKey: `order:${createdOrder.id}:pending`,
            note: `عمولة معلقة للطلب ${createdOrder.orderNumber}`,
          },
        });
      }

      return { order: createdOrder, replayed: false };
    });

    const isAdmin = auth?.user.role === 'ADMIN';
    return NextResponse.json(
      serializeOrderDTO(result.order, { includePlatformCost: isAdmin }),
      { status: result.replayed ? 200 : 201 }
    );
  } catch (err) {
    if (err instanceof NextResponse) return err;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'تم تسجيل هذا الطلب بالفعل (مفتاح منع التكرار مستخدم)', code: 'DUPLICATE_ORDER' },
        { status: 409 }
      );
    }
    console.error('API POST /api/orders error:', err);
    return NextResponse.json(
      { error: 'تعذر إنشاء الطلب، يرجى المحاولة مرة أخرى', code: 'ORDER_CREATE_FAILED' },
      { status: 500 }
    );
  }
}
