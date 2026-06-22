const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log("Connecting to Supabase...");
  const pool = new Pool({ connectionString });
  try {
    const users = await pool.query('SELECT id, name, email, role, "phoneNumber" FROM "User" ORDER BY "createdAt" DESC LIMIT 10;');
    console.log("Recent Users:");
    console.log(users.rows);

    const leases = await pool.query('SELECT id, "tenantId", "unitId", status, "startDate", "endDate" FROM "Lease" ORDER BY "createdAt" DESC LIMIT 5;');
    console.log("Recent Leases:");
    console.log(leases.rows);

    const payments = await pool.query('SELECT id, "tenantId", amount, status, type FROM "Payment" ORDER BY "createdAt" DESC LIMIT 5;');
    console.log("Recent Payments:");
    console.log(payments.rows);

    const audit = await pool.query('SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 10;');
    console.log("Recent Audit Logs:");
    console.log(audit.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
