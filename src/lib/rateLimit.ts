import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitOptions {
  /** Namespace prefix (e.g. 'orders:create', 'withdrawals:create', 'auth:google') */
  keyPrefix: string;
  /** Optional explicit identity (e.g. userId); defaults to client IP */
  identifier?: string;
  /** Max allowed requests within windowSeconds */
  limit: number;
  /** Sliding/fixed window duration in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtSeconds: number;
  backend: 'upstash' | 'memory';
}

interface MemoryBucket {
  timestamps: number[];
  expiresAt: number;
}

const MAX_MEMORY_KEYS = 5000;
const globalForRateLimit = globalThis as unknown as {
  __ctrlYzRateLimitStore?: Map<string, MemoryBucket>;
};

const memoryStore: Map<string, MemoryBucket> =
  globalForRateLimit.__ctrlYzRateLimitStore ?? new Map<string, MemoryBucket>();

if (!globalForRateLimit.__ctrlYzRateLimitStore) {
  globalForRateLimit.__ctrlYzRateLimitStore = memoryStore;
}

/**
 * Extract best-effort client IP from reverse proxy / Vercel headers.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;
  return 'unknown';
}

async function checkUpstashRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult | null> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!restUrl || !restToken) return null;

  try {
    // Fixed window key bucketed by current window slice for atomic INCR + EXPIRE via pipeline
    const nowSec = Math.floor(Date.now() / 1000);
    const windowBucket = Math.floor(nowSec / windowSeconds);
    const redisKey = `rl:${key}:${windowBucket}`;
    const resetAtSeconds = (windowBucket + 1) * windowSeconds;

    const res = await fetch(`${restUrl.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${restToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['EXPIRE', redisKey, windowSeconds + 5, 'NX'],
      ]),
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ result?: number }>;
    const count = Number(data?.[0]?.result ?? 1);

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAtSeconds,
      backend: 'upstash',
    };
  } catch (err) {
    console.warn('[RateLimit] Upstash REST failed; falling back to in-memory window:', err);
    return null;
  }
}

function checkMemorySlidingWindow(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  const cutoff = nowMs - windowMs;

  // Bounded sweep to prevent unbounded memory growth
  if (memoryStore.size >= MAX_MEMORY_KEYS) {
    memoryStore.forEach((bucket, bucketKey) => {
      if (bucket.expiresAt <= nowMs) {
        memoryStore.delete(bucketKey);
      }
    });
    if (memoryStore.size >= MAX_MEMORY_KEYS) {
      const oldestKey = memoryStore.keys().next().value;
      if (oldestKey) memoryStore.delete(oldestKey);
    }
  }

  const existing = memoryStore.get(key);
  const timestamps = existing
    ? existing.timestamps.filter((ts) => ts > cutoff)
    : [];

  if (timestamps.length >= limit) {
    const oldestActive = timestamps[0] ?? nowMs;
    const resetAtSeconds = Math.ceil((oldestActive + windowMs) / 1000);
    memoryStore.set(key, { timestamps, expiresAt: nowMs + windowMs });
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAtSeconds,
      backend: 'memory',
    };
  }

  timestamps.push(nowMs);
  memoryStore.set(key, { timestamps, expiresAt: nowMs + windowMs });

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - timestamps.length),
    resetAtSeconds: Math.ceil((nowMs + windowMs) / 1000),
    backend: 'memory',
  };
}

export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const identity = options.identifier?.trim() || getClientIp(request);
  const key = `${options.keyPrefix}:${identity}`;

  const upstash = await checkUpstashRateLimit(key, options.limit, options.windowSeconds);
  if (upstash) return upstash;

  return checkMemorySlidingWindow(key, options.limit, options.windowSeconds);
}

/**
 * Enforce rate limiting on an API route.
 * Returns a 429 NextResponse when exceeded, or null when allowed.
 */
export async function enforceRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const result = await checkRateLimit(request, options);
  if (result.allowed) return null;

  const retryAfter = Math.max(1, result.resetAtSeconds - Math.floor(Date.now() / 1000));

  return NextResponse.json(
    {
      error: 'تم تجاوز الحد المسموح من الطلبات. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterSeconds: retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.resetAtSeconds),
      },
    }
  );
}
