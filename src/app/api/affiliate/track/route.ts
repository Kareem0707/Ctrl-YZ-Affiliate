import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  attachReferralCookie,
  clearReferralCookie,
  REFERRAL_COOKIE_NAME,
  trackAffiliateClick,
} from '@/lib/affiliateAttribution';
import { enforceRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/affiliate/track
 * - With ?ref=CODE: validates ACTIVE affiliate, logs deduplicated AffiliateClick (30m window),
 *   and sets a 30-day `ctrl_ref` cookie (Max-Age=2592000).
 * - Without ?ref=: inspects existing `ctrl_ref` cookie, confirms affiliate is still ACTIVE,
 *   and returns safe zero-PII display info for storefront banner (or clears cookie if suspended).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refParam = searchParams.get('ref')?.trim();

    if (refParam) {
      const rateLimited = await enforceRateLimit(request, {
        keyPrefix: 'affiliate:track',
        limit: 60,
        windowSeconds: 60,
      });
      if (rateLimited) return rateLimited;

      const landing = searchParams.get('landing')?.trim() || `/?ref=${encodeURIComponent(refParam)}`;
      const result = await trackAffiliateClick(refParam, request, landing);

      if (!result.valid || !result.affiliateCode) {
        return NextResponse.json(
          { valid: false, error: 'كود الإحالة غير صالح أو غير مفعل' },
          { status: 404 }
        );
      }

      const response = NextResponse.json({
        valid: true,
        id: result.id,
        affiliateCode: result.affiliateCode,
        displayName: result.displayName,
        clickRecorded: !result.deduplicated,
        ttlDays: 30,
      });
      attachReferralCookie(response, result.affiliateCode);
      return response;
    }

    // No ?ref= param -> check existing 30-day ctrl_ref cookie
    const existingCode = request.cookies.get(REFERRAL_COOKIE_NAME)?.value?.trim();
    if (!existingCode) {
      return NextResponse.json({ valid: false });
    }

    const affiliate = await prisma.affiliate.findFirst({
      where: {
        affiliateCode: { equals: existingCode, mode: 'insensitive' },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        affiliateCode: true,
        user: { select: { name: true } },
      },
    });

    if (!affiliate) {
      const res = NextResponse.json({ valid: false });
      clearReferralCookie(res);
      return res;
    }

    return NextResponse.json({
      valid: true,
      id: affiliate.id,
      affiliateCode: affiliate.affiliateCode,
      displayName: affiliate.user.name,
    });
  } catch (error) {
    console.error('API GET /api/affiliate/track error:', error);
    return NextResponse.json(
      { valid: false, error: 'تعذر التحقق من رابط الإحالة' },
      { status: 500 }
    );
  }
}
