const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log("Connecting to Supabase production database...");
  const pool = new Pool({ connectionString });
  try {
    const propCount = await pool.query('SELECT COUNT(*)::int FROM "Property";');
    const unitCount = await pool.query('SELECT COUNT(*)::int FROM "Unit";');
    const userCount = await pool.query('SELECT COUNT(*)::int FROM "User" WHERE role = \'TENANT\';');
    const leaseCount = await pool.query('SELECT COUNT(*)::int FROM "Lease";');
    const paymentCount = await pool.query('SELECT COUNT(*)::int FROM "Payment";');
    const approvedPayments = await pool.query('SELECT COUNT(*)::int FROM "Payment" WHERE status = \'APPROVED\';');
    const pendingPayments = await pool.query('SELECT COUNT(*)::int FROM "Payment" WHERE status = \'PENDING\';');
    const penaltyCount = await pool.query('SELECT COUNT(*)::int FROM "Penalty";');

    console.log("\n--- Supabase Database Live Telemetry ---");
    console.log(`Total Properties:      ${propCount.rows[0].count}`);
    console.log(`Total Units:           ${unitCount.rows[0].count}`);
    console.log(`Active Tenant Users:   ${userCount.rows[0].count}`);
    console.log(`Active Leases:         ${leaseCount.rows[0].count}`);
    console.log(`Total Payments:        ${paymentCount.rows[0].count} (Approved: ${approvedPayments.rows[0].count}, Pending: ${pendingPayments.rows[0].count})`);
    console.log(`Total Penalties:       ${penaltyCount.rows[0].count}`);
    console.log("----------------------------------------\n");

  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await pool.end();
  }
}

run();
