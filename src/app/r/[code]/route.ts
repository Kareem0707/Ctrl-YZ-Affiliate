import { NextRequest, NextResponse } from 'next/server';
import {
  attachReferralCookie,
  trackAffiliateClick,
} from '@/lib/affiliateAttribution';
import { enforceRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * GET /r/[code]
 * Clean short affiliate referral link:
 * - Validates affiliate exists with status === 'ACTIVE'
 * - Logs deduplicated SHA-256 AffiliateClick (30-min window)
 * - Sets 30-day ctrl_ref cookie (Max-Age=2592000; Path=/; SameSite=Lax; HttpOnly; Secure in prod)
 * - Redirects cleanly to storefront root `/`
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const redirectUrl = new URL('/', request.url);
  const response = NextResponse.redirect(redirectUrl, { status: 307 });

  try {
    const rateLimited = await enforceRateLimit(request, {
      keyPrefix: 'affiliate:redirect',
      limit: 60,
      windowSeconds: 60,
    });
    if (rateLimited) {
      return response;
    }

    const result = await trackAffiliateClick(
      params.code,
      request,
      `/r/${encodeURIComponent(params.code || '')}`
    );

    if (result.valid && result.affiliateCode) {
      attachReferralCookie(response, result.affiliateCode);
    }
  } catch (err) {
    console.error('GET /r/[code] attribution error:', err);
  }

  return response;
}
