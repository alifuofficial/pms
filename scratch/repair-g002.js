const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

async function main() {
  const url = "file:./dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    console.log("Repairing G002 database records...");
    
    // 1. Delete the incorrect registration penalty
    await prisma.penalty.deleteMany({
      where: { leaseId: "cmpivr1qw000h9ktcwc6jumza" }
    });

    // 2. Update initial payment
    await prisma.payment.update({
      where: { id: "cmpivr1r9000i9ktccz884t4i" },
      data: {
        penalty: 0,
        advanceUntil: new Date("2026-02-07T21:00:00.000Z") // Tir 30
      }
    });

    // 3. Update lease
    await prisma.lease.update({
      where: { id: "cmpivr1qw000h9ktcwc6jumza" },
      data: {
        advanceBalance: 0
      }
    });

    console.log("G002 repaired successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
