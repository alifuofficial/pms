const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function run() {
  const pool = new Pool({ connectionString });
  try {
    const unitRes = await pool.query('SELECT * FROM "Unit" WHERE "unitNumber" = \'B02\';');
    console.log("UNIT B02:");
    console.log(JSON.stringify(unitRes.rows, null, 2));
    
    if (unitRes.rows.length === 0) return;
    const unitId = unitRes.rows[0].id;
    
    const leasesRes = await pool.query('SELECT l.*, u.name as "tenantName" FROM "Lease" l JOIN "User" u ON l."tenantId" = u.id WHERE l."unitId" = $1 ORDER BY l."createdAt" DESC;', [unitId]);
    console.log("\nLEASES FOR B02:");
    for (const lease of leasesRes.rows) {
      console.log(`\nLease ID: ${lease.id}`);
      console.log(`  Tenant: ${lease.tenantName} (ID: ${lease.tenantId})`);
      console.log(`  Status: ${lease.status}`);
      console.log(`  Start:  ${lease.startDate.toISOString()}`);
      console.log(`  End:    ${lease.endDate.toISOString()}`);
      
      const paymentsRes = await pool.query('SELECT * FROM "Payment" WHERE "leaseId" = $1 ORDER BY "dueDate" ASC;', [lease.id]);
      console.log(`  Payments:`);
      for (const p of paymentsRes.rows) {
        console.log(`    - ID: ${p.id}, amount: ${p.amount}, dueDate: ${p.dueDate.toISOString()}, status: ${p.status}, type: ${p.type}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
