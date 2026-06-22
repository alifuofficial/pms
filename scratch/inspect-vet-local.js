const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in process.env");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  // Eyuresalem Woldu (VET5JSAVRC)
  const unit = await prisma.unit.findFirst({
    where: { qrSlug: "VET5JSAVRC" },
    include: {
      leases: {
        include: {
          tenant: true,
          payments: { orderBy: { dueDate: "asc" } },
          penalties: { orderBy: { dueDate: "asc" } }
        }
      }
    }
  });

  console.log("=== VET5JSAVRC UNIT ===");
  console.log("UNIT:", JSON.stringify({
    id: unit?.id,
    unitNumber: unit?.unitNumber,
    rentAmount: unit?.rentAmount,
    status: unit?.status,
    qrSlug: unit?.qrSlug
  }, null, 2));

  if (unit?.leases?.length > 0) {
    const lease = unit.leases[0];
    console.log("LEASE:", JSON.stringify({
      id: lease.id,
      startDate: lease.startDate,
      endDate: lease.endDate,
      status: lease.status,
      advanceBalance: lease.advanceBalance,
      tenant: lease.tenant.name
    }, null, 2));

    console.log("PAYMENTS:");
    lease.payments.forEach(p => {
      console.log(`- ID: ${p.id}, Amount: ${p.amount}, DueDate: ${p.dueDate.toISOString().slice(0, 10)}, PaidAt: ${p.paidAt?.toISOString()?.slice(0, 10)}, Status: ${p.status}, Type: ${p.type}, AdvanceUntil: ${p.advanceUntil?.toISOString()?.slice(0, 10)}`);
    });

    console.log("PENALTIES:");
    lease.penalties.forEach(p => {
      console.log(`- ID: ${p.id}, Amount: ${p.amount}, PaidAmount: ${p.paidAmount}, DueDate: ${p.dueDate.toISOString().slice(0, 10)}, Status: ${p.status}`);
    });
  } else {
    console.log("NO LEASES");
  }

  // Also query Unit 001 to compare
  const unit001 = await prisma.unit.findFirst({
    where: { unitNumber: "001" },
    include: {
      leases: {
        include: {
          tenant: true,
          payments: { orderBy: { dueDate: "asc" } },
          penalties: { orderBy: { dueDate: "asc" } }
        }
      }
    }
  });

  console.log("\n=== UNIT 001 ===");
  console.log("UNIT:", JSON.stringify({
    id: unit001?.id,
    unitNumber: unit001?.unitNumber,
    rentAmount: unit001?.rentAmount,
    status: unit001?.status,
    qrSlug: unit001?.qrSlug
  }, null, 2));

  if (unit001?.leases?.length > 0) {
    const lease = unit001.leases[0];
    console.log("LEASE:", JSON.stringify({
      id: lease.id,
      startDate: lease.startDate,
      endDate: lease.endDate,
      status: lease.status,
      advanceBalance: lease.advanceBalance,
      tenant: lease.tenant.name
    }, null, 2));

    console.log("PAYMENTS:");
    lease.payments.forEach(p => {
      console.log(`- ID: ${p.id}, Amount: ${p.amount}, DueDate: ${p.dueDate.toISOString().slice(0, 10)}, PaidAt: ${p.paidAt?.toISOString()?.slice(0, 10)}, Status: ${p.status}, Type: ${p.type}, AdvanceUntil: ${p.advanceUntil?.toISOString()?.slice(0, 10)}`);
    });

    console.log("PENALTIES:");
    lease.penalties.forEach(p => {
      console.log(`- ID: ${p.id}, Amount: ${p.amount}, PaidAmount: ${p.paidAmount}, DueDate: ${p.dueDate.toISOString().slice(0, 10)}, Status: ${p.status}`);
    });
  } else {
    console.log("NO LEASES");
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
