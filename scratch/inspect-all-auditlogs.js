const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });
  
  auditLogs.forEach(log => {
    console.log(`- ${log.createdAt.toISOString()} | User: ${log.userId} | Action: ${log.action} | Metadata: ${log.metadata}`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
