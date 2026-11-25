import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import prisma from '@/lib/prisma';
import {
  computeNextStep,
  requireAuth,
  serializeAffiliateDTO,
  setSessionCookie,
} from '@/lib/auth/session';
import { marketerOnboardingSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const generateAsciiSuffix6 = customAlphabet('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 6);

function generateUniqueAffiliateCode(): string {
  return `YZ-${generateAsciiSuffix6()}`;
}

function getUniqueConstraintErrorMessage(err: Prisma.PrismaClientKnownRequestError): string {
  const target = Array.isArray(err.meta?.target)
    ? err.meta.target.join(',')
    : String(err.meta?.target || '');

  if (target.includes('phone')) {
    return 'رقم الهاتف مسجل بالفعل لحساب مسوق آخر.';
  }
  if (target.includes('national_id') || target.includes('nationalId')) {
    return 'الرقم القومي مسجل بالفعل لحساب مسوق آخر.';
  }
  if (target.includes('email')) {
    return 'البريد الإلكتروني مسجل بالفعل لحساب آخر.';
  }
  if (target.includes('user_id') || target.includes('userId')) {
    return 'لديك طلب انضمام مسوق مسجل بالفعل لهذا الحساب.';
  }
  if (target.includes('affiliate_code') || target.includes('affiliateCode')) {
    return 'كود الإحالة مستخدم بالفعل، يرجى المحاولة مرة أخرى.';
  }
  return 'توجد بيانات مكررة مسجلة مسبقاً في النظام.';
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    if (auth.affiliate) {
      return NextResponse.json(
        {
          error: 'لديك طلب انضمام مسجل بالفعل على هذا الحساب.',
          code: 'AFFILIATE_ALREADY_EXISTS',
          nextStep: computeNextStep(auth.user, auth.affiliate),
        },
        { status: 409 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = marketerOnboardingSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'بيانات الاستمارة غير مكتملة أو غير صالحة',
          code: 'VALIDATION_ERROR',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    let createdAffiliate = null;
    let updatedUser = auth.user;

    // Retry up to 3 times only if randomly generated affiliateCode collides
    for (let attempt = 0; attempt < 3; attempt++) {
      const affiliateCode = generateUniqueAffiliateCode();
      try {
        const txResult = await prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: auth.user.id },
            data: {
              name: data.name,
              role: auth.user.role === 'ADMIN' ? 'ADMIN' : 'MARKETER',
            },
          });

          const affiliate = await tx.affiliate.create({
            data: {
              userId: auth.user.id,
              phone: data.phone,
              whatsapp: data.whatsapp,
              nationalId: data.nationalId,
              city: data.city,
              marketingChannels: data.marketingChannels,
              channelLinks: data.channelLinks || null,
              experienceLevel: data.experienceLevel,
              expectedMonthlyOrders: data.expectedMonthlyOrders,
              affiliateCode,
              status: 'UNVERIFIED',
              walletBalance: new Prisma.Decimal('0.00'),
              pendingBalance: new Prisma.Decimal('0.00'),
              lockedBalance: new Prisma.Decimal('0.00'),
              totalEarned: new Prisma.Decimal('0.00'),
              totalWithdrawn: new Prisma.Decimal('0.00'),
              payoutMethod: data.payoutMethod,
              payoutAccount: data.payoutAccount,
              payoutHolderName: data.payoutHolderName || data.name,
              payoutBankName:
                data.payoutMethod === 'BANK_TRANSFER' ? data.payoutBankName || null : null,
            },
          });

          return { user, affiliate };
        });

        updatedUser = txResult.user;
        createdAffiliate = txResult.affiliate;
        break;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const target = String(err.meta?.target || '');
          if ((target.includes('affiliate_code') || target.includes('affiliateCode')) && attempt < 2) {
            continue;
          }
          return NextResponse.json(
            { error: getUniqueConstraintErrorMessage(err), code: 'DUPLICATE_RECORD' },
            { status: 409 }
          );
        }
        throw err;
      }
    }

    if (!createdAffiliate) {
      return NextResponse.json(
        { error: 'تعذر توليد كود إحالة فريد، يرجى المحاولة مرة أخرى', code: 'CODE_GEN_FAILED' },
        { status: 500 }
      );
    }

    const nextStep = computeNextStep(updatedUser, createdAffiliate);
    const response = NextResponse.json(
      {
        success: true,
        affiliate: serializeAffiliateDTO(createdAffiliate, updatedUser),
        nextStep,
      },
      { status: 201 }
    );

    await setSessionCookie(response, {
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      affiliateId: createdAffiliate.id,
      affiliateStatus: createdAffiliate.status,
    });

    return response;
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('API POST /api/marketers/register error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل طلب المسوق', code: 'REGISTER_FAILED' },
      { status: 500 }
    );
  }
}
