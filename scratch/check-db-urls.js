const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  const pool = new Pool({ connectionString });
  try {
    console.log("Checking DB records...");
    
    // settings
    const settingsRes = await pool.query('SELECT "logoUrl", "ftpBaseUrl" FROM "SystemSettings" WHERE id = \'global\';');
    console.log("System Settings:", settingsRes.rows[0]);
    
    // payments
    const paymentsRes = await pool.query('SELECT count(*)::int as count FROM "Payment" WHERE "receiptUrl" LIKE \'%/upload/%\';');
    console.log("Payments with /upload/ in receiptUrl:", paymentsRes.rows[0].count);

    // leases
    const leasesRes = await pool.query('SELECT count(*)::int as count FROM "Lease" WHERE "leaseAgreementUrl" LIKE \'%/upload/%\';');
    console.log("Leases with /upload/ in leaseAgreementUrl:", leasesRes.rows[0].count);
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
