import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Ensure WebSocket constructor is available in Node.js serverless/local runtimes
if (typeof globalThis.WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as {
  prismaGlobal?: PrismaClient;
};

function isNeonConnectionUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith('.neon.tech') ||
      parsed.hostname.endsWith('.neon.build') ||
      parsed.hostname.includes('neon')
    );
  } catch {
    return false;
  }
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  const logLevels: ('error' | 'warn')[] =
    process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'];

  // Use Neon Serverless Driver Adapter for Neon PostgreSQL & Vercel Serverless
  if (connectionString && (isNeonConnectionUrl(connectionString) || process.env.VERCEL === '1')) {
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({
      adapter,
      log: logLevels,
    });
  }

  // Standard pooled PrismaClient fallback (e.g. local PostgreSQL or build-time import)
  return new PrismaClient({
    log: logLevels,
  });
}

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prismaGlobal) {
    globalForPrisma.prismaGlobal = createPrismaClient();
  }
  return globalForPrisma.prismaGlobal;
}

/**
 * Lazy singleton Prisma client safe for Next.js 14 HMR & Vercel Serverless.
 * Accessing any model property lazily initializes the shared client instance.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export default prisma;
