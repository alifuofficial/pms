const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function run() {
  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query('SELECT * FROM "Payment" WHERE id = \'cmpm8p9v1002m2fny7h2idi72\';');
    console.log("Payment Row:", JSON.stringify(res.rows[0], null, 2));
    
    const leaseRes = await pool.query('SELECT * FROM "Lease" WHERE id = $1;', [res.rows[0].leaseId]);
    console.log("Lease Row:", JSON.stringify(leaseRes.rows[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
