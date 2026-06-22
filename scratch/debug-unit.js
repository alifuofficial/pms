const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
require("dotenv").config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const paymentIds = ["cmpm8p9v1002m2fny7h2idi72", "cmpm8jclr002c2fnya0mz85m6"];
  for (const id of paymentIds) {
    console.log(`\n=================== PAYMENT DETAILS: ${id} ===================`);
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        approver: true,
        lease: {
          include: {
            unit: true
          }
        }
      }
    });

    if (!payment) {
      console.log("Payment not found.");
      continue;
    }

    console.log(`Unit: ${payment.lease.unit.unitNumber}`);
    console.log(`Status: ${payment.status}`);
    console.log(`Amount: ${payment.amount}`);
    console.log(`Due Date: ${payment.dueDate.toISOString()}`);
    console.log(`Paid At: ${payment.paidAt ? payment.paidAt.toISOString() : 'null'}`);
    console.log(`Advance Until: ${payment.advanceUntil ? payment.advanceUntil.toISOString() : 'null'}`);
    console.log(`Created At: ${payment.createdAt.toISOString()}`);
    console.log(`Updated At: ${payment.updatedAt.toISOString()}`);
    console.log(`Approved By: ${payment.approvedBy} (${payment.approver ? payment.approver.name : 'null'})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect().then(() => pool.end()));
