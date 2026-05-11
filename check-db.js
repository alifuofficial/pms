const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const Database = require("better-sqlite3");

// Self-contained check script
async function check() {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  const dbPath = url.startsWith("file:") ? url.replace("file:", "") : url;
  
  console.log(`Connecting to database at: ${url}`);
  
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });


  try {
    console.log("Checking database tables...");
    const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table';`);
    console.log("Tables found:", JSON.stringify(tables, null, 2));
    
    const settingsCount = await prisma.systemSettings.count().catch(() => 0);
    console.log("System Settings records:", settingsCount);
    
  } catch (error) {
    console.error("Database check failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

check();


