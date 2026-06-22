const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  const pool = new Pool({ connectionString });
  try {
    const system = await pool.query('SELECT * FROM "SystemSettings" WHERE id = \'global\';');
    console.log("System Settings:");
    console.log(system.rows[0]);

    const users = await pool.query('SELECT id, name, email, role, "calendarType" FROM "User";');
    console.log("User Calendar Types:");
    console.log(users.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
