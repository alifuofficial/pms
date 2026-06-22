const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const tenantName = "Eyuresalem Woldu";
  const leaseId = "cmq9a7llf001x2gotvmdwsi67";
  const paymentId = "cmqcbevco005c2got4bb3cc0k";
  const penaltyId = "cmqcbffog005d2gotpoc3hbd2";

  console.log("Starting transaction to fix tenant database records...");

  await prisma.$transaction(async (tx) => {
    // 1. Update lease advanceBalance to 0
    const updatedLease = await tx.lease.update({
      where: { id: leaseId },
      data: { advanceBalance: 0 }
    });
    console.log(`- Updated Lease ${leaseId}: advanceBalance set to 0.`);

    // 2. Update payment advanceUntil and penalty
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        advanceUntil: new Date("2026-07-07T00:00:00.000Z"),
        penalty: 0
      }
    });
    console.log(`- Updated Payment ${paymentId}: advanceUntil set to 2026-07-07, penalty set to 0.`);

    // 3. Update penalty status, paidAmount, paidAt
    const updatedPenalty = await tx.penalty.update({
      where: { id: penaltyId },
      data: {
        status: "UNPAID",
        paidAmount: 0,
        paidAt: null
      }
    });
    console.log(`- Updated Penalty ${penaltyId}: status set to UNPAID, paidAmount set to 0, paidAt set to null.`);

    // 4. Create an audit log
    await tx.auditLog.create({
      data: {
        userId: "cmpkbnbpv00002guzyrvwz2mi", // Use the same admin user ID
        action: `Fixed bug for tenant Eyuresalem Woldu: Corrected Sene rent coverage (advanceUntil: 2026-07-07, penalty: 0) and marked late fee penalty as UNPAID (paidAmount: 0).`,
        actionType: "PAYMENT_APPROVAL",
        oldValue: JSON.stringify({
          advanceBalance: 5225,
          paymentAdvanceUntil: "2026-06-07T12:00:00.000Z",
          paymentPenaltyPaid: 275,
          penaltyStatus: "PAID",
          penaltyPaidAmount: 275
        }),
        newValue: JSON.stringify({
          advanceBalance: 0,
          paymentAdvanceUntil: "2026-07-07T00:00:00.000Z",
          paymentPenaltyPaid: 0,
          penaltyStatus: "UNPAID",
          penaltyPaidAmount: 0
        }),
        metadata: JSON.stringify({
          leaseId,
          paymentId,
          penaltyId
        })
      }
    });
    console.log("- Created audit log entry.");
  });

  console.log("Database transaction completed successfully!");
}

run().catch(console.error).finally(() => prisma.$disconnect());
