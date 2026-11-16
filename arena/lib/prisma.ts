import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const DEFAULT_NEON_POOLER_URL =
  "postgresql://neondb_owner:npg_Uvif9XBMeWZ8@ep-dry-resonance-bdpyl8cp-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=30&pool_timeout=30&connection_limit=25&schema=arena&pgbouncer=true";

export const DEFAULT_NEON_DIRECT_URL =
  "postgresql://neondb_owner:npg_Uvif9XBMeWZ8@ep-dry-resonance-bdpyl8cp.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=30&schema=arena";

export function sanitizeDatabaseUrl(): string {
  const raw =
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

  if (!url || !url.startsWith("postgres")) {
    url = DEFAULT_NEON_POOLER_URL;
  }

  // Remove channel_binding=require caso presente (incompatível com alguns ambientes serverless Linux)
  url = url
    .replace(/([?&])channel_binding=require(&?)/g, (_, p1, p2) =>
      p2 ? p1 : ""
    )
    .replace(/[?&]$/, "");

  // Amplia connection_limit baixo (ex: connection_limit=5) para evitar esgotamento de pool com SSE + APIs
  if (/connection_limit=\d+/.test(url)) {
    url = url.replace(/connection_limit=\d+/, "connection_limit=25");
  } else {
    url += (url.includes("?") ? "&" : "?") + "connection_limit=25";
  }

  if (/pool_timeout=\d+/.test(url)) {
    url = url.replace(/pool_timeout=\d+/, "pool_timeout=30");
  } else {
    url += (url.includes("?") ? "&" : "?") + "pool_timeout=30";
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

  // Auto-retry robusto (até 5 tentativas) para absorver cold-start do Neon/PgBouncer
  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const maxRetries = 5;
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
                lower.includes("timed out") ||
                lower.includes("timeout") ||
                lower.includes("closed") ||
                lower.includes("connection") ||
                lower.includes("econnreset") ||
                lower.includes("socket") ||
                lower.includes("p1000") ||
                lower.includes("p1001") ||
                lower.includes("p1002") ||
                lower.includes("p1008") ||
                lower.includes("p1017") ||
                lower.includes("p2024");

              if (!isTransientConnectionError || attempt === maxRetries) {
                throw error;
              }
              try {
                await baseClient.$disconnect();
              } catch {}
              await new Promise((r) => setTimeout(r, attempt * 400));
            }
          }
          throw lastError;
        },
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
