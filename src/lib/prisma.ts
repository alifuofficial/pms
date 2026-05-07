import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import "dotenv/config";

const globalForPrisma = globalThis as unknown as {
  pms_prisma_v3: PrismaClient | undefined;
};

const getAdapter = () => {
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  // better-sqlite3 expects a path, not a file: URL
  const dbPath = dbUrl.replace(/^file:/, "");
  const sqlite = new Database(dbPath);
  return new PrismaBetterSqlite3(sqlite);
};

export const prisma =
  globalForPrisma.pms_prisma_v3 ??
  new PrismaClient({
    adapter: getAdapter(),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.pms_prisma_v3 = prisma;

// Force reload client - clean reload