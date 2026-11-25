import { NextRequest, NextResponse } from 'next/server';
import { Prisma, type AffiliateStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth, serializeAffiliateDTO } from '@/lib/auth/session';
import { marketerReviewSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/marketers/[id]/status
 * ADMIN-only state machine transition for Affiliate applications & accounts:
 * - approve:    PENDING -> ACTIVE (with optional ASCII affiliateCode)
 * - reject:     PENDING -> REJECTED (with mandatory rejectionReason)
 * - suspend:    ACTIVE -> SUSPENDED
 * - reactivate: SUSPENDED -> ACTIVE
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);

    const rawBody = await request.json().catch(() => null);
    const parsed = marketerReviewSchema.safeParse({
      ...(rawBody && typeof rawBody === 'object' ? rawBody : {}),
      id: params.id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'بيانات تحديث حالة المسوق غير صالحة',
          code: 'VALIDATION_ERROR',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const existing = await prisma.affiliate.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'حساب المسوق غير موجود', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    let nextStatus: AffiliateStatus;
    let rejectionReason: string | null = existing.rejectionReason;
    let affiliateCode = existing.affiliateCode;

    if (input.action === 'approve') {
      if (existing.status !== 'PENDING' && existing.status !== 'UNVERIFIED') {
        return NextResponse.json(
          {
            error: `لا يمكن قبول الطلب من الحالة الحالية (${existing.status})`,
            code: 'INVALID_STATE_TRANSITION',
          },
          { status: 409 }
        );
      }
      nextStatus = 'ACTIVE';
      rejectionReason = null;
      if (input.affiliateCode) {
        affiliateCode = input.affiliateCode;
      }
    } else if (input.action === 'reject') {
      if (existing.status !== 'PENDING' && existing.status !== 'UNVERIFIED') {
        return NextResponse.json(
          {
            error: `لا يمكن رفض الطلب من الحالة الحالية (${existing.status})`,
            code: 'INVALID_STATE_TRANSITION',
          },
          { status: 409 }
        );
      }
      nextStatus = 'REJECTED';
      rejectionReason = input.rejectionReason;
    } else if (input.action === 'suspend') {
      if (existing.status !== 'ACTIVE') {
        return NextResponse.json(
          {
            error: 'يمكن إيقاف الحسابات النشطة فقط',
            code: 'INVALID_STATE_TRANSITION',
          },
          { status: 409 }
        );
      }
      nextStatus = 'SUSPENDED';
      rejectionReason = input.rejectionReason ?? 'تم إيقاف الحساب بواسطة الإدارة';
    } else {
      // reactivate
      if (existing.status !== 'SUSPENDED' && existing.status !== 'REJECTED') {
        return NextResponse.json(
          {
            error: 'الحساب نشط بالفعل أو قيد المراجعة',
            code: 'INVALID_STATE_TRANSITION',
          },
          { status: 409 }
        );
      }
      nextStatus = 'ACTIVE';
      rejectionReason = null;
    }

    const updated = await prisma.affiliate.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        affiliateCode,
        rejectionReason,
        reviewedBy: auth.user.email,
        reviewedAt: new Date(),
      },
      include: { user: true },
    });

    return NextResponse.json({
      success: true,
      affiliate: serializeAffiliateDTO(updated, updated.user),
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'كود الإحالة المحدد مستخدم بالفعل لمسوق آخر', code: 'DUPLICATE_AFFILIATE_CODE' },
        { status: 409 }
      );
    }
    console.error('API PATCH /api/marketers/[id]/status error:', err);
    return NextResponse.json(
      { error: 'تعذر تحديث حالة المسوق', code: 'MARKETER_STATUS_UPDATE_FAILED' },
      { status: 500 }
    );
  }
}
