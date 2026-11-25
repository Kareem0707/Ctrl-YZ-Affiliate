import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { serializeSettingsDTO, serializeShippingRateDTO } from '@/lib/serializers';
import {
  moneySchema,
  settingsUpdateSchema,
  shippingRateUpdateSchema,
} from '@/lib/validators';

export const dynamic = 'force-dynamic';

async function getOrCreatePlatformSettings() {
  return prisma.platformSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storeName: 'Ctrl YZ Affiliate',
      currency: 'EGP',
      contactWhatsApp: '+201012345678',
      announcementAr: 'كامبين الشتاء الرسمي 2026 — عمولات تبدأ من 220 وتصل إلى 260 ج.م على كل قطعة هودي',
      announcementEn: 'Winter 2026 Official Campaign — Commissions starting from 220 up to 260 EGP per hoodie',
      minWithdrawalAmount: new Prisma.Decimal('200.00'),
      returnWindowDays: 7,
    },
  });
}

/**
 * GET /api/settings
 * Public read of platform settings & active governorate shipping rates from PostgreSQL.
 */
export async function GET() {
  try {
    const [settingsRow, shippingRates, categoryRows] = await Promise.all([
      getOrCreatePlatformSettings(),
      prisma.shippingRate.findMany({
        where: { isActive: true },
        orderBy: { governorateAr: 'asc' },
      }),
      prisma.product.findMany({
        where: { isActive: true, archivedAt: null },
        distinct: ['category'],
        select: { category: true },
      }),
    ]);

    const categories = categoryRows.map((c) => c.category).filter(Boolean);

    const serializedRates = shippingRates.map(serializeShippingRateDTO);

    return NextResponse.json({
      settings: serializeSettingsDTO(settingsRow, categories),
      shippingRates: serializedRates,
      governorates: serializedRates,
    });
  } catch (error) {
    console.error('API GET /api/settings error:', error);
    return NextResponse.json(
      { error: 'تعذر تحميل إعدادات المنصة', code: 'SETTINGS_FETCH_FAILED' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * ADMIN-only update of platform settings and/or shipping rates.
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAuth(request, ['ADMIN']);

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'بيانات الإعدادات غير صالحة', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    // 1. Optional PlatformSettings update
    if (body.settings && typeof body.settings === 'object') {
      const s = body.settings as Record<string, unknown>;
      const parsedSettings = settingsUpdateSchema.safeParse({
        ...(s.storeName !== undefined ? { storeName: s.storeName } : {}),
        ...(s.currency !== undefined ? { currency: s.currency } : {}),
        ...(s.contactWhatsApp !== undefined ? { contactWhatsApp: s.contactWhatsApp } : {}),
        ...(s.announcementAr !== undefined || s.announcement !== undefined
          ? { announcementAr: s.announcementAr ?? s.announcement }
          : {}),
        ...(s.announcementEn !== undefined ? { announcementEn: s.announcementEn } : {}),
        ...(s.minWithdrawalAmount !== undefined
          ? { minWithdrawalAmount: s.minWithdrawalAmount }
          : {}),
        ...(s.returnWindowDays !== undefined ? { returnWindowDays: s.returnWindowDays } : {}),
      });

      if (!parsedSettings.success) {
        return NextResponse.json(
          {
            error: parsedSettings.error.issues[0]?.message || 'بيانات الإعدادات غير صالحة',
            code: 'VALIDATION_ERROR',
            issues: parsedSettings.error.issues,
          },
          { status: 400 }
        );
      }

      const d = parsedSettings.data;
      await getOrCreatePlatformSettings();
      await prisma.platformSettings.update({
        where: { id: 1 },
        data: {
          ...(d.storeName !== undefined ? { storeName: d.storeName } : {}),
          ...(d.currency !== undefined ? { currency: d.currency } : {}),
          ...(d.contactWhatsApp !== undefined ? { contactWhatsApp: d.contactWhatsApp } : {}),
          ...(d.announcementAr !== undefined ? { announcementAr: d.announcementAr } : {}),
          ...(d.announcementEn !== undefined ? { announcementEn: d.announcementEn } : {}),
          ...(d.minWithdrawalAmount !== undefined
            ? { minWithdrawalAmount: new Prisma.Decimal(d.minWithdrawalAmount.toFixed(2)) }
            : {}),
          ...(d.returnWindowDays !== undefined ? { returnWindowDays: d.returnWindowDays } : {}),
        },
      });
    }

    // 2. Optional single shipping rate update ({ shippingRate: { id, fee } })
    if (body.shippingRate && typeof body.shippingRate === 'object') {
      const sr = body.shippingRate as Record<string, unknown>;
      const feeParsed = moneySchema.safeParse(sr.fee);
      if (typeof sr.id !== 'string' || !sr.id.trim() || !feeParsed.success) {
        return NextResponse.json(
          { error: 'بيانات تكلفة الشحن غير صالحة', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }

      await prisma.shippingRate.update({
        where: { id: sr.id.trim() },
        data: { fee: new Prisma.Decimal(feeParsed.data.toFixed(2)) },
      });
    }

    // 3. Optional bulk governorates update
    if (Array.isArray(body.governorates)) {
      for (const gov of body.governorates as Record<string, unknown>[]) {
        const parsedRate = shippingRateUpdateSchema.safeParse({
          id: typeof gov.id === 'string' ? gov.id : undefined,
          governorateAr: gov.governorateAr ?? gov.governorate_ar,
          governorateEn: gov.governorateEn ?? gov.governorate_en,
          fee: gov.fee,
          estimatedDays: gov.estimatedDays ?? gov.deliveryTime ?? '2-4 أيام',
          isActive: gov.isActive !== false,
        });
        if (!parsedRate.success) {
          return NextResponse.json(
            {
              error: parsedRate.error.issues[0]?.message || 'بيانات الشحن غير صالحة',
              code: 'VALIDATION_ERROR',
            },
            { status: 400 }
          );
        }
        const r = parsedRate.data;
        await prisma.shippingRate.upsert({
          where: { governorateAr: r.governorateAr },
          update: {
            governorateEn: r.governorateEn,
            fee: new Prisma.Decimal(r.fee.toFixed(2)),
            estimatedDays: r.estimatedDays,
            isActive: r.isActive,
          },
          create: {
            governorateAr: r.governorateAr,
            governorateEn: r.governorateEn,
            fee: new Prisma.Decimal(r.fee.toFixed(2)),
            estimatedDays: r.estimatedDays,
            isActive: r.isActive,
          },
        });
      }
    }

    const [settingsRow, shippingRates] = await Promise.all([
      getOrCreatePlatformSettings(),
      prisma.shippingRate.findMany({
        where: { isActive: true },
        orderBy: { governorateAr: 'asc' },
      }),
    ]);

    const serializedRates = shippingRates.map(serializeShippingRateDTO);

    return NextResponse.json({
      settings: serializeSettingsDTO(settingsRow),
      shippingRates: serializedRates,
      governorates: serializedRates,
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API PUT /api/settings error:', err);
    return NextResponse.json(
      { error: 'تعذر تحديث الإعدادات', code: 'SETTINGS_UPDATE_FAILED' },
      { status: 500 }
    );
  }
}
