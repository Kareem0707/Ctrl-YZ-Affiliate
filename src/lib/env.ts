import { z } from 'zod';

/**
 * Public client-safe environment variables.
 * Never throws during static analysis/build when optional keys are omitted.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_ADMIN_EMAIL: z.string().email().optional(),
});

/**
 * Server-only environment variables schema.
 * Validated lazily at runtime so `next build` succeeds even before production
 * secrets are injected into CI/local environments.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Neon PostgreSQL
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL').optional(),
  DIRECT_URL: z.string().url('DIRECT_URL must be a valid direct PostgreSQL URL').optional(),

  // Authentication & Session Signing
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters').optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  ADMIN_EMAILS: z.string().optional(),

  // Cloud Object Storage (Vercel Blob or Cloudflare R2)
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Verification Channels (WhatsApp OTP / Email SMTP)
  WHATSAPP_API_URL: z.string().url().optional(),
  WHATSAPP_API_TOKEN: z.string().min(1).optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM: z.string().email().optional(),

  // Webhooks & Cron Jobs
  WEBHOOK_SIGNING_SECRET: z.string().min(16).optional(),
  CRON_SECRET: z.string().min(16).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: emptyToUndefined(process.env.NEXT_PUBLIC_APP_URL),
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: emptyToUndefined(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
    NEXT_PUBLIC_ADMIN_EMAIL: emptyToUndefined(process.env.NEXT_PUBLIC_ADMIN_EMAIL),
  });
}

let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() cannot be called in a browser environment.');
  }

  if (cachedServerEnv && process.env.NODE_ENV === 'production') {
    return cachedServerEnv;
  }

  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: emptyToUndefined(process.env.NODE_ENV),
    DATABASE_URL: emptyToUndefined(process.env.DATABASE_URL),
    DIRECT_URL: emptyToUndefined(process.env.DIRECT_URL),
    AUTH_SECRET: emptyToUndefined(process.env.AUTH_SECRET),
    GOOGLE_CLIENT_ID: emptyToUndefined(
      process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    ),
    GOOGLE_CLIENT_SECRET: emptyToUndefined(process.env.GOOGLE_CLIENT_SECRET),
    ADMIN_EMAILS: emptyToUndefined(
      process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL
    ),
    BLOB_READ_WRITE_TOKEN: emptyToUndefined(process.env.BLOB_READ_WRITE_TOKEN),
    R2_ACCOUNT_ID: emptyToUndefined(process.env.R2_ACCOUNT_ID),
    R2_ACCESS_KEY_ID: emptyToUndefined(process.env.R2_ACCESS_KEY_ID),
    R2_SECRET_ACCESS_KEY: emptyToUndefined(process.env.R2_SECRET_ACCESS_KEY),
    R2_BUCKET_NAME: emptyToUndefined(process.env.R2_BUCKET_NAME),
    R2_PUBLIC_URL: emptyToUndefined(process.env.R2_PUBLIC_URL),
    WHATSAPP_API_URL: emptyToUndefined(process.env.WHATSAPP_API_URL),
    WHATSAPP_API_TOKEN: emptyToUndefined(process.env.WHATSAPP_API_TOKEN),
    SMTP_HOST: emptyToUndefined(process.env.SMTP_HOST),
    SMTP_PORT: emptyToUndefined(process.env.SMTP_PORT),
    SMTP_USER: emptyToUndefined(process.env.SMTP_USER),
    SMTP_PASS: emptyToUndefined(process.env.SMTP_PASS),
    SMTP_FROM: emptyToUndefined(process.env.SMTP_FROM),
    WEBHOOK_SIGNING_SECRET: emptyToUndefined(process.env.WEBHOOK_SIGNING_SECRET),
    CRON_SECRET: emptyToUndefined(process.env.CRON_SECRET),
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid server environment configuration: ${details}`);
  }

  cachedServerEnv = parsed.data;
  return parsed.data;
}

/**
 * Strictly require a specific server environment variable at runtime.
 * Throws a clear error naming the missing key instead of failing silently.
 */
export function requireServerEnv<K extends keyof ServerEnv>(
  key: K
): NonNullable<ServerEnv[K]> {
  const env = getServerEnv();
  const value = env[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(
      `Missing required server environment variable "${String(key)}". ` +
        `Please configure it in .env / .env.local (or Vercel Project Settings).`
    );
  }
  return value as NonNullable<ServerEnv[K]>;
}

/**
 * Parse comma-separated list of authorized admin emails in lowercase.
 */
export function getConfiguredAdminEmails(): string[] {
  const env = getServerEnv();
  const raw = env.ADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes('@'));
}
