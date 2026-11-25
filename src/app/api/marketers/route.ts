import { NextRequest, NextResponse } from 'next/server';
import { Prisma, type AffiliateStatus } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, serializeAffiliateDTO } from '@/lib/auth/session';
import {
  asciiAffiliateCodeSchema,
  buildPaginationMeta,
  egyptianNationalIdSchema,
  egyptianPhoneSchema,
  paginationQuerySchema,
  payoutMethodSchema,
} from '@/lib/validators';

export const dynamic = 'force-dynamic';

const generateSuffix6 = customAlphabet('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 6);

const adminCreateMarketerSchema = z.object({
  name: z.string().trim().min(3, 'الاسم مطلوب').max(120),
  email: z.string().trim().toLowerCase().email('البريد الإلكتروني غير صالح'),
  phone: egyptianPhoneSchema,
  whatsapp: egyptianPhoneSchema.optional(),
  nationalId: egyptianNationalIdSchema.optional(),
  city: z.string().trim().min(2).max(80).default('القاهرة'),
  affiliateCode: asciiAffiliateCodeSchema.optional(),
  payoutMethod: payoutMethodSchema.default('VODAFONE_CASH'),
  payoutAccount: z.string().trim().min(6).max(120).optional(),
});

/**
 * GET /api/marketers
 * - Unauthenticated: 401 Unauthorized (never leaks PII publicly).
 * - MARKETER: returns ONLY their own affiliate profile (strict BOLA protection).
 * - ADMIN: returns paginated list of affiliates with live order stats.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'MARKETER']);

    // Marketer can ONLY read their own profile regardless of query params
    if (auth.user.role === 'MARKETER') {
      if (!auth.affiliate) {
        return NextResponse.json({
          data: [],
          pagination: buildPaginationMeta(0, 1, 20),
        });
      }

      const [ordersCount, deliveredCount, clicksCount] = await Promise.all([
        prisma.order.count({ where: { affiliateId: auth.affiliate.id } }),
        prisma.order.count({
          where: {
            affiliateId: auth.affiliate.id,
            status: { in: ['DELIVERED', 'PARTIALLY_RETURNED'] },
          },
        }),
        prisma.affiliateClick.count({ where: { affiliateId: auth.affiliate.id } }),
      ]);

      const selfDto = serializeAffiliateDTO(auth.affiliate, auth.user, {
        ordersCount,
        deliveredCount,
        clicksCount,
      });

      return NextResponse.json({
        data: [selfDto],
        pagination: buildPaginationMeta(1, 1, 1),
      });
    }

    // ADMIN paginated list with optional status & search filter
    const { searchParams } = new URL(request.url);
    const parsedQuery = paginationQuerySchema.safeParse({
      page: searchParams.get('page') ?? 1,
      limit: searchParams.get('limit') ?? 50,
      search: searchParams.get('search') ?? undefined,
    });

    const page = parsedQuery.success ? parsedQuery.data.page : 1;
    const limit = parsedQuery.success ? parsedQuery.data.limit : 50;
    const search = parsedQuery.success ? parsedQuery.data.search : undefined;
    const statusParam = searchParams.get('status')?.toUpperCase() as AffiliateStatus | undefined;
    const validStatuses: AffiliateStatus[] = [
      'UNVERIFIED',
      'PENDING',
      'ACTIVE',
      'REJECTED',
      'SUSPENDED',
    ];

    const where: Prisma.AffiliateWhereInput = {
      ...(statusParam && validStatuses.includes(statusParam) ? { status: statusParam } : {}),
      ...(search
        ? {
            OR: [
              { affiliateCode: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { city: { contains: search, mode: 'insensitive' } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, affiliates] = await Promise.all([
      prisma.affiliate.count({ where }),
      prisma.affiliate.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          _count: {
            select: { orders: true, clicks: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const affiliateIds = affiliates.map((a) => a.id);
    const deliveredGroups =
      affiliateIds.length > 0
        ? await prisma.order.groupBy({
            by: ['affiliateId'],
            where: {
              affiliateId: { in: affiliateIds },
              status: 'DELIVERED',
            },
            _count: { _all: true },
          })
        : [];

    const deliveredMap = new Map<string, number>();
    for (const g of deliveredGroups) {
      if (g.affiliateId) deliveredMap.set(g.affiliateId, g._count._all);
    }

    const data = affiliates.map((aff) =>
      serializeAffiliateDTO(aff, aff.user, {
        ordersCount: aff._count.orders,
        deliveredCount: deliveredMap.get(aff.id) ?? 0,
        clicksCount: aff._count.clicks,
      })
    );

    return NextResponse.json({
      data,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API GET /api/marketers error:', err);
    return NextResponse.json(
      { error: 'تعذر تحميل بيانات المسوقين', code: 'MARKETERS_FETCH_FAILED' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketers
 * ADMIN-only manual marketer creation with strict Zod whitelist.
 * Self-registration MUST use POST /api/marketers/register.
 * Mass assignment of walletBalance / totalEarned / role is strictly forbidden.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);

    const rawBody = await request.json().catch(() => null);
    const parsed = adminCreateMarketerSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'بيانات المسوق غير صالحة',
          code: 'VALIDATION_ERROR',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const code = d.affiliateCode || `YZ-${generateSuffix6()}`;
    const generatedFallbackNationalId =
      d.nationalId || `2990101${String(Date.now()).slice(-7)}`;

    const created = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email: d.email } });
      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              name: d.name,
              role: existingUser.role === 'ADMIN' ? 'ADMIN' : 'MARKETER',
            },
          })
        : await tx.user.create({
            data: {
              email: d.email,
              name: d.name,
              role: 'MARKETER',
              emailVerifiedAt: new Date(),
            },
          });

      const affiliate = await tx.affiliate.create({
        data: {
          userId: user.id,
          phone: d.phone,
          whatsapp: d.whatsapp || d.phone,
          nationalId: generatedFallbackNationalId,
          city: d.city,
          affiliateCode: code,
          status: 'ACTIVE',
          payoutMethod: d.payoutMethod,
          payoutAccount: d.payoutAccount || d.phone,
          payoutHolderName: d.name,
          reviewedBy: auth.user.email,
          reviewedAt: new Date(),
        },
      });

      return { user, affiliate };
    });

    return NextResponse.json(
      serializeAffiliateDTO(created.affiliate, created.user),
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof NextResponse) return err;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'رقم الهاتف أو البريد أو كود الإحالة أو الرقم القومي مستخدم بالفعل', code: 'DUPLICATE_RECORD' },
        { status: 409 }
      );
    }
    console.error('API POST /api/marketers error:', err);
    return NextResponse.json(
      { error: 'تعذر إنشاء حساب المسوق', code: 'MARKETER_CREATE_FAILED' },
      { status: 500 }
    );
  }
}
