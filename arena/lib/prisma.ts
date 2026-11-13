import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function sanitizeDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    let url = process.env.DATABASE_URL.trim();
    if (
      (url.startsWith('"') && url.endsWith('"')) ||
      (url.startsWith("'") && url.endsWith("'"))
    ) {
      url = url.slice(1, -1).trim();
    }
    if (url.includes("-pooler.") && !url.includes("pgbouncer=true")) {
      url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
    }
    process.env.DATABASE_URL = url;
  }
}

sanitizeDatabaseUrl();

function createPrismaClient() {
  sanitizeDatabaseUrl();
  const dbUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/postgres?schema=arena";

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
