const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const penalties = await prisma.payment.findMany({
    where: { penaltyAmount: { gt: 0 } },
    include: { 
      tenant: { select: { name: true } },
      lease: { include: { unit: true } }
    }
  });
  console.log(JSON.stringify(penalties, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
