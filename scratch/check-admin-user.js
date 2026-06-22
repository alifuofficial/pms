const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log("Connecting to Supabase...");
  const pool = new Pool({ connectionString });
  try {
    const unitRes = await pool.query('SELECT * FROM "Unit" WHERE "unitNumber" = \'F1D9\';');
    const unit = unitRes.rows[0];
    if (!unit) {
      console.log("Unit F1D9 not found");
      return;
    }
    console.log("UNIT:", unit);

    const leaseRes = await pool.query('SELECT * FROM "Lease" WHERE "unitId" = $1;', [unit.id]);
    const leases = leaseRes.rows;
    console.log("LEASES:", leases);

    if (leases.length > 0) {
      const leaseId = leases[0].id;
      const paymentRes = await pool.query('SELECT * FROM "Payment" WHERE "leaseId" = $1 ORDER BY "dueDate" ASC;', [leaseId]);
      console.log("PAYMENTS:", paymentRes.rows);

      const penaltyRes = await pool.query('SELECT * FROM "Penalty" WHERE "leaseId" = $1 ORDER BY "dueDate" ASC;', [leaseId]);
      console.log("PENALTIES:", penaltyRes.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();










