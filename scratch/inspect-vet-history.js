const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const leaseId = "cmq9a7llf001x2gotvmdwsi67";
  
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: {
      tenant: true,
      unit: true,
      payments: { orderBy: { dueDate: "asc" } },
      penalties: { orderBy: { dueDate: "asc" } }
    }
  });

  console.log("LEASE:", JSON.stringify({
    id: lease.id,
    advanceBalance: lease.advanceBalance,
    tenant: lease.tenant.name
  }, null, 2));

  console.log("PAYMENTS:");
  lease.payments.forEach(p => {
    console.log(JSON.stringify(p, null, 2));
  });

  console.log("PENALTIES:");
  lease.penalties.forEach(p => {
    console.log(JSON.stringify(p, null, 2));
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        contains: leaseId
      }
    },
    orderBy: { createdAt: "asc" }
  });
  
  console.log("AUDIT LOGS directly mentioning leaseId:");
  auditLogs.forEach(log => {
    console.log(`- ${log.createdAt.toISOString()}: ${log.action} | metadata: ${log.metadata}`);
  });

  const auditLogs2 = await prisma.auditLog.findMany({
    where: {
      OR: [
        { action: { contains: "Eyuresalem" } },
        { action: { contains: "VET5JSAVRC" } }
      ]
    },
    orderBy: { createdAt: "asc" }
  });
  
  console.log("\nAUDIT LOGS mentioning name/slug:");
  auditLogs2.forEach(log => {
    console.log(`- ${log.createdAt.toISOString()}: ${log.action}`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
