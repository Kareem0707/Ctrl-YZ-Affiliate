import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referrals/[code]
 * Minimal public zero-PII lookup for storefront referral links (`/?ref=CODE`).
 * Returns ONLY public display name & code for ACTIVE affiliates. Never exposes phone/email/nationalId/wallet.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = decodeURIComponent(params.code || '').trim().toUpperCase();
    if (!code || code.length > 32) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }

    const affiliate = await prisma.affiliate.findFirst({
      where: {
        affiliateCode: { equals: code, mode: 'insensitive' },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        affiliateCode: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!affiliate) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      id: affiliate.id,
      affiliateCode: affiliate.affiliateCode,
      displayName: affiliate.user.name,
    });
  } catch (error) {
    console.error('API GET /api/referrals/[code] error:', error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
