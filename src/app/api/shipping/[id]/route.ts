import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { serializeShippingRateDTO } from '@/lib/serializers';
import { moneySchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const shippingPatchSchema = z.object({
  fee: moneySchema.optional(),
  estimatedDays: z.string().trim().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PATCH /api/shipping/[id]
 * ADMIN-only update of a single governorate shipping rate in PostgreSQL.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request, ['ADMIN']);

    const rawBody = await request.json().catch(() => null);
    const parsed = shippingPatchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'بيانات تعديل الشحن غير صالحة',
          code: 'VALIDATION_ERROR',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const existing = await prisma.shippingRate.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'تعريفة الشحن المحددة غير موجودة', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const d = parsed.data;
    const updated = await prisma.shippingRate.update({
      where: { id: existing.id },
      data: {
        ...(d.fee !== undefined ? { fee: new Prisma.Decimal(d.fee.toFixed(2)) } : {}),
        ...(d.estimatedDays !== undefined ? { estimatedDays: d.estimatedDays } : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
      },
    });

    return NextResponse.json(serializeShippingRateDTO(updated));
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API PATCH /api/shipping/[id] error:', err);
    return NextResponse.json(
      { error: 'تعذر تحديث سعر الشحن', code: 'SHIPPING_UPDATE_FAILED' },
      { status: 500 }
    );
  }
}
