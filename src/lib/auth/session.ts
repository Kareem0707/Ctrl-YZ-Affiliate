import { NextRequest, NextResponse } from 'next/server';
import type { Affiliate, User } from '@prisma/client';
import prisma from '@/lib/prisma';
import { toMoneyNumber } from '@/lib/validators';
import type { Marketer, MarketerStatus } from '@/lib/types';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  getSessionCookieOptions,
  signSessionToken,
  verifySessionToken,
  type SessionAffiliateStatus,
  type SessionPayload,
  type SessionRole,
} from './jwt';

export {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  getSessionCookieOptions,
  signSessionToken,
  verifySessionToken,
  type SessionAffiliateStatus,
  type SessionPayload,
  type SessionRole,
};

export type AuthNextStep =
  | 'admin'
  | 'onboarding'
  | 'verify_otp'
  | 'pending_review'
  | 'affiliate_dashboard'
  | 'rejected';

export interface VerifiedAuthContext {
  session: SessionPayload;
  user: User;
  affiliate: Affiliate | null;
}

export interface RequireAuthOptions {
  requireActiveAffiliate?: boolean;
}

/**
 * Attach signed HttpOnly session cookie to a NextResponse.
 */
export async function setSessionCookie(
  response: NextResponse,
  payload: SessionPayload
): Promise<void> {
  const token = await signSessionToken(payload);
  const opts = getSessionCookieOptions(SESSION_TTL_SECONDS);
  response.cookies.set(opts.name, token, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    maxAge: opts.maxAge,
  });
}

/**
 * Clear the HttpOnly session cookie on logout or invalid session.
 */
export function clearSessionCookie(response: NextResponse): void {
  const opts = getSessionCookieOptions(0);
  response.cookies.set(opts.name, '', {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    maxAge: 0,
  });
}

/**
 * Parse and cryptographically verify the session cookie from a NextRequest.
 */
export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/**
 * Verify session token AND re-fetch live User + Affiliate from Prisma DB
 * so role changes or account suspensions take effect immediately.
 */
export async function getVerifiedAuthContext(
  req: NextRequest
): Promise<VerifiedAuthContext | null> {
  const session = await getSessionFromRequest(req);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { affiliate: true },
  });

  if (!user) return null;

  const { affiliate, ...userOnly } = user;

  return {
    session: {
      userId: userOnly.id,
      email: userOnly.email,
      role: userOnly.role,
      affiliateId: affiliate?.id ?? null,
      affiliateStatus: affiliate?.status ?? null,
    },
    user: userOnly,
    affiliate: affiliate ?? null,
  };
}

/**
 * Enforce authentication, RBAC roles, and optional active affiliate status.
 * Throws a standardized 401 or 403 NextResponse on failure.
 */
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: SessionRole[],
  options?: RequireAuthOptions
): Promise<VerifiedAuthContext> {
  const ctx = await getVerifiedAuthContext(req);

  if (!ctx) {
    throw NextResponse.json(
      { error: 'يجب تسجيل الدخول للوصول إلى هذا المورد', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(ctx.user.role)) {
    throw NextResponse.json(
      { error: 'ليس لديك صلاحية للقيام بهذا الإجراء', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  if (options?.requireActiveAffiliate && ctx.user.role !== 'ADMIN') {
    if (!ctx.affiliate) {
      throw NextResponse.json(
        { error: 'يرجى استكمال بيانات التسجيل كمسوق أولاً', code: 'AFFILIATE_REQUIRED' },
        { status: 403 }
      );
    }
    if (ctx.affiliate.status !== 'ACTIVE') {
      throw NextResponse.json(
        {
          error: 'حساب المسوق غير مفعل حالياً — يجب إتمام التحقق وموافقة الإدارة',
          code: 'AFFILIATE_NOT_ACTIVE',
          affiliateStatus: ctx.affiliate.status,
        },
        { status: 403 }
      );
    }
  }

  return ctx;
}

/**
 * Determine the canonical onboarding/navigation nextStep from live DB state.
 */
export function computeNextStep(
  user: Pick<User, 'role'>,
  affiliate: Pick<Affiliate, 'status'> | null
): AuthNextStep {
  if (user.role === 'ADMIN') return 'admin';
  if (!affiliate) return 'onboarding';

  switch (affiliate.status) {
    case 'UNVERIFIED':
      return 'verify_otp';
    case 'PENDING':
      return 'pending_review';
    case 'ACTIVE':
      return 'affiliate_dashboard';
    case 'REJECTED':
    case 'SUSPENDED':
      return 'rejected';
    default:
      return 'onboarding';
  }
}

export function serializeUserDTO(user: User) {
  return {
    id: user.id,
    uid: user.id,
    email: user.email,
    name: user.name,
    displayName: user.name,
    avatarUrl: user.avatarUrl,
    photoURL: user.avatarUrl,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    phoneVerifiedAt: user.phoneVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

function mapAffiliateStatusToLegacy(status: SessionAffiliateStatus): MarketerStatus {
  switch (status) {
    case 'ACTIVE':
      return 'active';
    case 'REJECTED':
      return 'rejected';
    case 'SUSPENDED':
      return 'suspended';
    case 'UNVERIFIED':
    case 'PENDING':
    default:
      return 'pending';
  }
}

function mapPayoutMethodToLegacy(
  method: Affiliate['payoutMethod']
): 'vodafone_cash' | 'instapay' | 'bank_transfer' {
  switch (method) {
    case 'INSTAPAY':
      return 'instapay';
    case 'BANK_TRANSFER':
      return 'bank_transfer';
    case 'VODAFONE_CASH':
    default:
      return 'vodafone_cash';
  }
}

/**
 * Serialize Prisma Affiliate + User into consistent Marketer DTO
 * (preserves both new DB status enum & legacy lowercase UI status fields).
 */
export function serializeAffiliateDTO(
  affiliate: Affiliate,
  user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>,
  stats?: { ordersCount?: number; deliveredCount?: number; clicksCount?: number }
): Marketer & { dbStatus: SessionAffiliateStatus; lockedBalance: number; clicksCount: number; conversionRate: number } {
  const ordersCount = stats?.ordersCount ?? 0;
  const deliveredCount = stats?.deliveredCount ?? 0;
  const clicksCount = stats?.clicksCount ?? 0;
  const deliveryRate =
    ordersCount > 0 ? Math.round((deliveredCount / ordersCount) * 100) : 100;
  const conversionRate =
    clicksCount > 0 ? Math.round((ordersCount / clicksCount) * 1000) / 10 : 0;

  return {
    id: affiliate.id,
    uid: user.id,
    name: user.name,
    email: user.email,
    phone: affiliate.phone,
    whatsapp: affiliate.whatsapp,
    avatar: user.avatarUrl ?? undefined,
    nationalId: affiliate.nationalId,
    city: affiliate.city,
    marketingChannels: affiliate.marketingChannels,
    channelLinks: affiliate.channelLinks ?? undefined,
    experienceLevel: (affiliate.experienceLevel as Marketer['experienceLevel']) ?? 'intermediate',
    expectedMonthlyOrders: affiliate.expectedMonthlyOrders ?? undefined,
    rejectionReason: affiliate.rejectionReason ?? undefined,
    reviewedAt: affiliate.reviewedAt?.toISOString(),
    reviewedBy: affiliate.reviewedBy ?? undefined,
    affiliateCode: affiliate.affiliateCode,
    walletBalance: toMoneyNumber(affiliate.walletBalance),
    pendingBalance: toMoneyNumber(affiliate.pendingBalance),
    lockedBalance: toMoneyNumber(affiliate.lockedBalance),
    totalEarned: toMoneyNumber(affiliate.totalEarned),
    totalWithdrawn: toMoneyNumber(affiliate.totalWithdrawn),
    ordersCount,
    deliveredCount,
    deliveryRate,
    clicksCount,
    conversionRate,
    status: mapAffiliateStatusToLegacy(affiliate.status),
    dbStatus: affiliate.status,
    payoutInfo: {
      method: mapPayoutMethodToLegacy(affiliate.payoutMethod),
      accountNumber: affiliate.payoutAccount,
      accountHolderName: affiliate.payoutHolderName ?? user.name,
      bankName: affiliate.payoutBankName ?? undefined,
    },
    createdAt: affiliate.createdAt.toISOString(),
  };
}
