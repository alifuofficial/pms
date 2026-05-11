import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import "dotenv/config";

const globalForPrisma = globalThis as unknown as {
  pms_prisma_v4: PrismaClient | undefined;
};

const getAdapter = () => {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  // Normalize path for better-sqlite3 (strip file: prefix and handle potential relative paths)
  let dbPath = url.startsWith("file:") ? url.replace("file:", "") : url;
  
  // Ensure the path is clean for better-sqlite3
  const sqlite = new Database(dbPath);
  
  // Important for performance and safety in SQLite
  sqlite.pragma('journal_mode = WAL');
  
  return new PrismaBetterSqlite3(sqlite);
};

export const prisma =
  globalForPrisma.pms_prisma_v4 ??
  new PrismaClient({
    adapter: getAdapter(),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.pms_prisma_v4 = prisma;