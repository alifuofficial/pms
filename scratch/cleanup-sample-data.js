const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log("Connecting to Supabase production database for cleanup...");
  const pool = new Pool({ connectionString });
  
  try {
    await pool.query("BEGIN;");

    console.log("Deleting sample penalties...");
    const penRes = await pool.query('DELETE FROM "Penalty" WHERE id LIKE \'sample-%\';');
    console.log(`Deleted ${penRes.rowCount} penalties.`);

    console.log("Deleting sample payments...");
    const payRes = await pool.query('DELETE FROM "Payment" WHERE id LIKE \'sample-%\';');
    console.log(`Deleted ${payRes.rowCount} payments.`);

    console.log("Deleting sample leases...");
    const leaseRes = await pool.query('DELETE FROM "Lease" WHERE id LIKE \'sample-%\';');
    console.log(`Deleted ${leaseRes.rowCount} leases.`);

    console.log("Deleting sample units...");
    const unitRes = await pool.query('DELETE FROM "Unit" WHERE id LIKE \'sample-%\';');
    console.log(`Deleted ${unitRes.rowCount} units.`);

    console.log("Deleting sample properties...");
    const propRes = await pool.query('DELETE FROM "Property" WHERE id LIKE \'sample-%\';');
    console.log(`Deleted ${propRes.rowCount} properties.`);

    console.log("Deleting sample users...");
    const userRes = await pool.query('DELETE FROM "User" WHERE id LIKE \'sample-%\';');
    console.log(`Deleted ${userRes.rowCount} users.`);

    await pool.query("COMMIT;");
    console.log("\nSample data cleanup completed successfully! The database is now clean of sample records.");
  } catch (err) {
    await pool.query("ROLLBACK;");
    console.error("Cleanup failed:", err);
  } finally {
    await pool.end();
  }
}

run();
