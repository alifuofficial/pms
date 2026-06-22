const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log("Connecting to Supabase production database...");
  const pool = new Pool({ connectionString });
  try {
    console.log("Fetching unit info for B01...");
    const unitRes = await pool.query('SELECT * FROM "Unit" WHERE "unitNumber" = $1;', ['B01']);
    console.log("Units found:", unitRes.rows);

    if (unitRes.rows.length === 0) {
      console.log("No unit B01 found.");
      return;
    }

    const unit = unitRes.rows[0];
    const unitId = unit.id;

    console.log("\nFetching leases for unit B01...");
    const leasesRes = await pool.query('SELECT * FROM "Lease" WHERE "unitId" = $1;', [unitId]);
    console.log("Leases found:", leasesRes.rows);

    for (const lease of leasesRes.rows) {
      console.log(`\n--- Info for Lease: ${lease.id} (${lease.status}) ---`);
      
      const tenantRes = await pool.query('SELECT * FROM "User" WHERE id = $1;', [lease.tenantId]);
      console.log("Tenant:", tenantRes.rows[0]);

      const paymentsRes = await pool.query('SELECT * FROM "Payment" WHERE "leaseId" = $1 ORDER BY "dueDate" ASC;', [lease.id]);
      console.log("Payments:", paymentsRes.rows);

      const penaltiesRes = await pool.query('SELECT * FROM "Penalty" WHERE "leaseId" = $1 ORDER BY "dueDate" ASC;', [lease.id]);
      console.log("Penalties:", penaltiesRes.rows);
    }

  } catch (err) {
    console.error("Failed to fetch info:", err);
  } finally {
    await pool.end();
  }
}

run();
