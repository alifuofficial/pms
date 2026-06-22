const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log("Connecting to Supabase...");
  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query('SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 10;');
    console.log("Recent Audit Logs:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
