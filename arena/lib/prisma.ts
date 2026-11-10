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

  // Auto-retry em caso de cold-start (scale-to-zero wake-up) ou oscilação momentânea do Neon/Postgres
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
              const isTransientConnectionError =
                message.includes("Can't reach database server") ||
                message.includes("Timed out fetching a new connection") ||
                message.includes("Closed") ||
                message.includes("ConnectionReset") ||
                message.includes("ECONNRESET") ||
                message.includes("P1001") ||
                message.includes("P1002");

              if (!isTransientConnectionError || attempt === maxRetries) {
                throw error;
              }
              await new Promise((r) => setTimeout(r, attempt * 600));
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
