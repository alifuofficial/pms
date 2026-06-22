const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const payment = await prisma.payment.findUnique({
    where: { id: "cmqhujkhf00002grkfi8gbblw" },
    include: {
      lease: {
        include: {
          tenant: true,
          unit: true
        }
      }
    }
  });

  console.log("PAYMENT:", JSON.stringify(payment, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
