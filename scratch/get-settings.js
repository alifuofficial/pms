const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query('SELECT * FROM "SystemSettings" WHERE id = \'global\';');
    console.log("System Settings:", JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
