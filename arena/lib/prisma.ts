import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const DEFAULT_NEON_POOLER_URL =
  "postgresql://neondb_owner:npg_Uvif9XBMeWZ8@ep-dry-resonance-bdpyl8cp-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=30&pool_timeout=30&connection_limit=5&schema=arena&pgbouncer=true";

const DEFAULT_NEON_DIRECT_URL =
  "postgresql://neondb_owner:npg_Uvif9XBMeWZ8@ep-dry-resonance-bdpyl8cp.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=30&schema=arena";

export function sanitizeDatabaseUrl(): string {
  let raw =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    DEFAULT_NEON_POOLER_URL;

  let url = raw.trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }

  if (!url) {
    url = DEFAULT_NEON_POOLER_URL;
  }

  // Garante que conexões ao banco utilizem o schema=arena onde todas as tabelas residem
  if (!url.includes("schema=")) {
    url += (url.includes("?") ? "&" : "?") + "schema=arena";
  }

  // Garante compatibilidade com PgBouncer do Neon em ambientes serverless (Vercel)
  if (url.includes("-pooler.") && !url.includes("pgbouncer=true")) {
    url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
  }

  if (!url.includes("connect_timeout=")) {
    url += (url.includes("?") ? "&" : "?") + "connect_timeout=30";
  }

  process.env.DATABASE_URL = url;
  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = DEFAULT_NEON_DIRECT_URL;
  }

  return url;
}

sanitizeDatabaseUrl();

function createPrismaClient() {
  const dbUrl = sanitizeDatabaseUrl();

  const baseClient = new PrismaClient({
    datasourceUrl: dbUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Auto-retry em caso de cold-start (scale-to-zero wake-up) ou oscilação momentânea do Neon/PgBouncer
  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const maxRetries = 3;
          let lastError: unknown;
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              return await query(args);
            } catch (error: unknown) {
              lastError = error;
              const message =
                error instanceof Error ? error.message : String(error);
              const lower = message.toLowerCase();
              const isTransientConnectionError =
                lower.includes("can't reach database server") ||
                lower.includes("timed out fetching a new connection") ||
                lower.includes("closed") ||
                lower.includes("connectionreset") ||
                lower.includes("econnreset") ||
                lower.includes("p1001") ||
                lower.includes("p1002") ||
                lower.includes("p1017") ||
                lower.includes("server has closed the connection") ||
                lower.includes("connection terminated") ||
                lower.includes("terminating connection");

              if (!isTransientConnectionError || attempt === maxRetries) {
                throw error;
              }
              try {
                await baseClient.$disconnect();
              } catch {}
              await new Promise((r) => setTimeout(r, attempt * 500));
            }
          }
          throw lastError;
        },
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
