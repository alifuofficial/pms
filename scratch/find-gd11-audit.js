const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function run() {
  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query('SELECT * FROM "AuditLog" WHERE action LIKE \'%cmpm8p9v1002m2fny7h2idi72%\' OR action LIKE \'%cmpm8p9uk002l2fnyypzl6ju1%\' OR metadata LIKE \'%cmpm8p9v1002m2fny7h2idi72%\' ORDER BY "createdAt" DESC;');
    console.log("GD11 Audit Logs:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
