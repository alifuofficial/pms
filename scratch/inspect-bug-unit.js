const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function main() {
  const pool = new Pool({ connectionString });
  try {
    const unitRes = await pool.query('SELECT * FROM "Unit" WHERE "qrSlug" = $1;', ["GUHY6Z46UA"]);
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

main();
