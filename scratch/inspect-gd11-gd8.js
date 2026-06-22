const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function inspect(slug, name) {
  const pool = new Pool({ connectionString });
  try {
    console.log(`\n=================== INSPECTING ${name} (${slug}) ===================`);
    const unitRes = await pool.query('SELECT * FROM "Unit" WHERE "qrSlug" = $1;', [slug]);
    if (unitRes.rows.length === 0) {
      console.log("Unit not found");
      return;
    }
    const unit = unitRes.rows[0];
    console.log("UNIT:", {
      id: unit.id,
      unitNumber: unit.unitNumber,
      rentAmount: unit.rentAmount,
      status: unit.status
    });

    const leaseRes = await pool.query('SELECT * FROM "Lease" WHERE "unitId" = $1 AND "status" IN (\'ACTIVE\', \'PENDING\');', [unit.id]);
    if (leaseRes.rows.length === 0) {
      console.log("No active lease");
      return;
    }
    const lease = leaseRes.rows[0];
    console.log("LEASE:", {
      id: lease.id,
      status: lease.status,
      startDate: lease.startDate,
      endDate: lease.endDate,
      advanceBalance: lease.advanceBalance
    });

    const tenantRes = await pool.query('SELECT name, "phoneNumber" FROM "User" WHERE "id" = $1;', [lease.tenantId]);
    console.log("TENANT:", tenantRes.rows[0]);

    const paymentsRes = await pool.query('SELECT * FROM "Payment" WHERE "leaseId" = $1 ORDER BY "dueDate" ASC;', [lease.id]);
    console.log("PAYMENTS:");
    paymentsRes.rows.forEach(p => {
      console.log(`- ID: ${p.id}, amount: ${p.amount}, dueDate: ${p.dueDate}, status: ${p.status}, type: ${p.type}, advanceUntil: ${p.advanceUntil}`);
    });

    const penaltiesRes = await pool.query('SELECT * FROM "Penalty" WHERE "leaseId" = $1 ORDER BY "dueDate" ASC;', [lease.id]);
    console.log("PENALTIES:");
    penaltiesRes.rows.forEach(p => {
      console.log(`- ID: ${p.id}, amount: ${p.amount}, paidAmount: ${p.paidAmount}, status: ${p.status}, dueDate: ${p.dueDate}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

async function main() {
  await inspect("DE22RDZ296", "GD11");
  await inspect("3U3D7LFUM9", "GD8");
}

main();
