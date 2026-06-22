import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";
import { getLeaseUncollectedBalance } from "../src/lib/arrears";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const lease = await prisma.lease.findUnique({
    where: { id: "cmq6nv97t002u2go0kbplj1eq" },
    include: {
      tenant: true,
      unit: { include: { property: true } },
      payments: true,
      penalties: true,
      utilityBills: true,
      lockoutFees: true
    }
  });

  const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });

  console.log("=== CALCULATION WITH NULL terminatedAt ===");
  const balanceNull = getLeaseUncollectedBalance(lease, settings, new Date("2026-06-22T08:52:20+03:00"));
  console.log(JSON.stringify(balanceNull, null, 2));

  console.log("=== CALCULATION WITH terminatedAt = updatedAt (June 9) ===");
  const leaseWithUpdatedAt = {
    ...lease,
    terminatedAt: lease?.updatedAt
  };
  const balanceUpdatedAt = getLeaseUncollectedBalance(leaseWithUpdatedAt, settings, new Date("2026-06-22T08:52:20+03:00"));
  console.log(JSON.stringify(balanceUpdatedAt, null, 2));

  console.log("=== CALCULATION WITH terminatedAt = May 8 (start date) ===");
  const leaseWithStartDate = {
    ...lease,
    terminatedAt: lease?.startDate
  };
  const balanceStartDate = getLeaseUncollectedBalance(leaseWithStartDate, settings, new Date("2026-06-22T08:52:20+03:00"));
  console.log(JSON.stringify(balanceStartDate, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
