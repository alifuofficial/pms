const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const paymentIds = [
    "cmq9a7llw001y2got5ms35ibk",
    "cmqcbevco005c2got4bb3cc0k"
  ];
  
  for (const id of paymentIds) {
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { metadata: { contains: id } },
          { action: { contains: id } }
        ]
      }
    });
    console.log(`LOGS FOR ${id}:`);
    console.log(JSON.stringify(logs, null, 2));
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
