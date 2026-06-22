const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log("Connecting to Supabase...");
  const pool = new Pool({ connectionString });
  try {
    console.log("Updating SystemSettings ftpBaseUrl...");
    const res = await pool.query(
      'UPDATE "SystemSettings" SET "ftpBaseUrl" = $1 WHERE id = $2 RETURNING *;',
      ["https://storage.soretiinternational.com/upload/", "global"]
    );
    console.log("Updated record successfully!");
    console.log(`New ftpBaseUrl: ${res.rows[0].ftpBaseUrl}`);
  } catch (err) {
    console.error("Error updating database:", err);
  } finally {
    await pool.end();
  }
}

run();
