import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import type { JWTPayload } from 'jose';

export const SESSION_COOKIE_NAME = 'ctrl_yz_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionRole = 'CUSTOMER' | 'MARKETER' | 'ADMIN';
export type SessionAffiliateStatus =
  | 'UNVERIFIED'
  | 'PENDING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUSPENDED';

export interface SessionPayload {
  userId: string;
  email: string;
  role: SessionRole;
  affiliateId?: string | null;
  affiliateStatus?: SessionAffiliateStatus | null;
}

interface SignedSessionClaims extends JWTPayload {
  userId: string;
  email: string;
  role: SessionRole;
  affiliateId?: string | null;
  affiliateStatus?: SessionAffiliateStatus | null;
}

const DEV_FALLBACK_SECRET = 'ctrl-yz-dev-only-insecure-fallback-secret-key-min-32-chars';
let warnedMissingDevSecret = false;

function getJwtSecretBytes(): Uint8Array {
  const configured = process.env.AUTH_SECRET?.trim();

  if (configured && configured.length >= 32) {
    return new TextEncoder().encode(configured);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRITICAL SECURITY ERROR: AUTH_SECRET environment variable must be set (min 32 characters) in production.'
    );
  }

  if (!warnedMissingDevSecret) {
    warnedMissingDevSecret = true;
    console.warn(
      '[Auth] AUTH_SECRET is not set or < 32 chars. Using development-only fallback secret. Set AUTH_SECRET in .env.local before deploying.'
    );
  }

  return new TextEncoder().encode(DEV_FALLBACK_SECRET);
}

/**
 * Sign an HS256 JWT session token (Edge Runtime & Node compatible).
 */
export async function signSessionToken(
  payload: SessionPayload,
  ttlSeconds: number = SESSION_TTL_SECONDS
): Promise<string> {
  const secret = getJwtSecretBytes();
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    affiliateId: payload.affiliateId ?? null,
    affiliateStatus: payload.affiliateStatus ?? null,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret);
}

/**
 * Verify an HS256 JWT session token (Edge Runtime & Node compatible).
 * Returns null for missing, expired, tampered, or malformed tokens.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null;

  try {
    const secret = getJwtSecretBytes();
    const { payload } = await jwtVerify<SignedSessionClaims>(token, secret, {
      algorithms: ['HS256'],
    });

    if (
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      !['CUSTOMER', 'MARKETER', 'ADMIN'].includes(payload.role)
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      affiliateId: payload.affiliateId ?? null,
      affiliateStatus: payload.affiliateStatus ?? null,
    };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(maxAgeSeconds: number = SESSION_TTL_SECONDS) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
