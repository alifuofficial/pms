const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function run() {
  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query('SELECT * FROM "AuditLog" WHERE "actionType" = \'LEASE_UPDATE\' OR action LIKE \'%Modified lease dates%\' ORDER BY "createdAt" DESC;');
    console.log("Lease Update Audit Logs:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
