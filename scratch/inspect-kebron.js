const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const leases = await prisma.lease.findMany({
    where: {
      status: { in: ["TERMINATED", "LOCKED_OUT"] },
      terminatedAt: null
    },
    include: {
      tenant: true,
      unit: true
    }
  });

  console.log(`Found ${leases.length} leases with status TERMINATED/LOCKED_OUT but terminatedAt is null:`);
  for (const lease of leases) {
    console.log(`Lease ID: ${lease.id}`);
    console.log(`  Tenant: ${lease.tenant.name}`);
    console.log(`  Unit: ${lease.unit.unitNumber}`);
    console.log(`  Status: ${lease.status}`);
    console.log(`  StartDate: ${lease.startDate}`);
    console.log(`  EndDate: ${lease.endDate}`);
    console.log(`  CreatedAt: ${lease.createdAt}`);
    console.log(`  UpdatedAt: ${lease.updatedAt}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
