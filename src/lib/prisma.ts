import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import "dotenv/config";

const globalForPrisma = globalThis as unknown as {
  pms_prisma_v4: PrismaClient | undefined;
};

const getAdapter = () => {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  return new PrismaBetterSqlite3({ url });
};

export const prisma =
  globalForPrisma.pms_prisma_v4 ??
  new PrismaClient({
    adapter: getAdapter(),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.pms_prisma_v4 = prisma;
