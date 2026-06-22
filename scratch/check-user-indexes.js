const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log("Connecting to Supabase...");
  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'User';
    `);
    console.log("User Indexes:");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
