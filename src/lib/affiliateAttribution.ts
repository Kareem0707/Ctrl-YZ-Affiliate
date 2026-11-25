import crypto from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getClientIp } from '@/lib/rateLimit';

export const REFERRAL_COOKIE_NAME = 'ctrl_ref';
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days (2,592,000s)
const CLICK_DEDUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

function hashPrivacyToken(raw: string): string {
  const salt = process.env.AUTH_SECRET?.trim() || 'ctrl-yz-click-salt';
  return crypto
    .createHash('sha256')
    .update(`${salt}:${raw}`)
    .digest('hex');
}

export interface TrackAffiliateClickResult {
  valid: boolean;
  id?: string;
  affiliateCode?: string;
  displayName?: string;
  deduplicated?: boolean;
}

/**
 * Validates that an affiliate code belongs to an ACTIVE affiliate, then logs a
 * SHA-256 privacy-preserving AffiliateClick with a 30-minute per-(affiliateId, ipHash)
 * deduplication window to prevent click-spam inflation.
 */
export async function trackAffiliateClick(
  rawCode: string | null | undefined,
  request: NextRequest,
  landingUrlOverride?: string
): Promise<TrackAffiliateClickResult> {
  const cleaned = decodeURIComponent(rawCode || '').trim().toUpperCase();
  if (!cleaned || cleaned.length > 32) {
    return { valid: false };
  }

  const affiliate = await prisma.affiliate.findFirst({
    where: {
      affiliateCode: { equals: cleaned, mode: 'insensitive' },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      affiliateCode: true,
      user: { select: { name: true } },
    },
  });

  if (!affiliate) {
    return { valid: false };
  }

  const clientIp = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ipHash = hashPrivacyToken(clientIp);
  const userAgentHash = hashPrivacyToken(userAgent);
  const cutoff = new Date(Date.now() - CLICK_DEDUP_WINDOW_MS);

  const recentClick = await prisma.affiliateClick.findFirst({
    where: {
      affiliateId: affiliate.id,
      ipHash,
      createdAt: { gte: cutoff },
    },
    select: { id: true },
  });

  if (!recentClick) {
    const landingUrl = (landingUrlOverride || request.nextUrl.pathname + request.nextUrl.search).slice(0, 500);
    await prisma.affiliateClick.create({
      data: {
        affiliateId: affiliate.id,
        ipHash,
        userAgentHash,
        landingUrl,
      },
    });
  }

  return {
    valid: true,
    id: affiliate.id,
    affiliateCode: affiliate.affiliateCode,
    displayName: affiliate.user.name,
    deduplicated: Boolean(recentClick),
  };
}

export function attachReferralCookie(response: NextResponse, affiliateCode: string): void {
  response.cookies.set({
    name: REFERRAL_COOKIE_NAME,
    value: affiliateCode,
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
}

export function clearReferralCookie(response: NextResponse): void {
  response.cookies.set({
    name: REFERRAL_COOKIE_NAME,
    value: '',
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
}
