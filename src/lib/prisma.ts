import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon, PrismaNeonHttp } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaHttp: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

/**
 * HTTP-based Prisma client for read-only queries.
 * Uses Neon's HTTP driver (single fetch round-trip, no WebSocket handshake)
 * for lower latency on simple SELECT-style queries.
 *
 * IMPORTANT: HTTP driver does NOT support interactive transactions
 * (`prisma.$transaction(async (tx) => ...)`). Use `prisma` (WS adapter)
 * for any handler that needs transactions or write batching.
 */
function createPrismaHttpClient() {
  const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {
    arrayMode: false,
    fullResults: true,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
const prismaHttp = globalForPrisma.prismaHttp ?? createPrismaHttpClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaHttp = prismaHttp;
}
