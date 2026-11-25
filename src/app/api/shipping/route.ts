import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getVerifiedAuthContext } from '@/lib/auth/session';
import { serializeShippingRateDTO } from '@/lib/serializers';
import { buildPaginationMeta, paginationQuerySchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/shipping
 * Returns active Egyptian governorate shipping rates directly from PostgreSQL.
 * ADMIN callers may pass ?includeInactive=true.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getVerifiedAuthContext(request).catch(() => null);
    const isAdmin = auth?.user.role === 'ADMIN';

    const { searchParams } = new URL(request.url);
    const parsed = paginationQuerySchema.safeParse({
      page: searchParams.get('page') ?? 1,
      limit: searchParams.get('limit') ?? 50,
    });
    const page = parsed.success ? parsed.data.page : 1;
    const limit = parsed.success ? parsed.data.limit : 50;
    const includeInactive = isAdmin && searchParams.get('includeInactive') === 'true';

    const where = includeInactive ? {} : { isActive: true };

    const [total, rates] = await Promise.all([
      prisma.shippingRate.count({ where }),
      prisma.shippingRate.findMany({
        where,
        orderBy: { governorateAr: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data: rates.map(serializeShippingRateDTO),
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error('API GET /api/shipping error:', error);
    return NextResponse.json(
      { error: 'تعذر تحميل أسعار الشحن', code: 'SHIPPING_FETCH_FAILED' },
      { status: 500 }
    );
  }
}
