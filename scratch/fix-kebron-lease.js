const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const leaseId = "cmq6nv97t002u2go0kbplj1eq";

  console.log(`Starting cleanup of erroneous B02 lease: ${leaseId}`);

  await prisma.$transaction(async (tx) => {
    // 1. Delete associated payments
    const paymentsDeleted = await tx.payment.deleteMany({ where: { leaseId } });
    console.log(`Deleted ${paymentsDeleted.count} payments`);

    // 2. Delete associated penalties
    const penaltiesDeleted = await tx.penalty.deleteMany({ where: { leaseId } });
    console.log(`Deleted ${penaltiesDeleted.count} penalties`);

    // 3. Delete associated utilityBills
    const utilitiesDeleted = await tx.utilityBill.deleteMany({ where: { leaseId } });
    console.log(`Deleted ${utilitiesDeleted.count} utility bills`);

    // 4. Delete associated lockoutFees
    const lockoutFeesDeleted = await tx.lockoutFee.deleteMany({ where: { leaseId } });
    console.log(`Deleted ${lockoutFeesDeleted.count} lockout fees`);

    // 5. Delete associated refunds
    const refundsDeleted = await tx.refund.deleteMany({ where: { leaseId } });
    console.log(`Deleted ${refundsDeleted.count} refunds`);

    // 6. Delete associated seizedProperties
    const seizedDeleted = await tx.seizedProperty.deleteMany({ where: { leaseId } });
    console.log(`Deleted ${seizedDeleted.count} seized properties`);

    // 7. Delete the lease itself
    const leaseDeleted = await tx.lease.delete({ where: { id: leaseId } });
    console.log(`Deleted lease: ${leaseDeleted.id} for tenant: ${leaseDeleted.tenantId}`);
  });

  console.log("Cleanup completed successfully!");
}

run().catch(console.error).finally(() => prisma.$disconnect());
