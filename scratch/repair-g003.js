const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

async function main() {
  const url = "file:./dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    console.log("Repairing G003 database records...");
    
    // 1. Update initial payment advanceUntil to Hamle 1 (2026-07-08T21:00:00.000Z)
    await prisma.payment.update({
      where: { id: "cmpixay0p000y9ktcg5rfdoev" },
      data: {
        penalty: 0,
        advanceUntil: new Date("2026-07-08T21:00:00.000Z")
      }
    });

    // 2. Update lease to clear advanceBalance
    await prisma.lease.update({
      where: { id: "cmpixaxyw000x9ktc87hyr7ie" },
      data: {
        advanceBalance: 0
      }
    });

    console.log("G003 repaired successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
