import { Pool } from "pg";
import Kenat from "kenat";
import dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

function toEthiopian(date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
  const parts = fmt.formatToParts(date);
  const partMap = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }
  const year = parseInt(partMap.year);
  const month = parseInt(partMap.month);
  const day = parseInt(partMap.day);
  const gregDate = new Date(year, month - 1, day, 12, 0, 0);
  return new Kenat(gregDate).getEthiopian();
}

function getDaysInEthiopianMonth(year, month) {
  if (month < 13) return 30;
  const isLeap = (year + 1) % 4 === 0;
  return isLeap ? 6 : 5;
}

async function run() {
  const pool = new Pool({ connectionString });
  try {
    const leasesRes = await pool.query('SELECT l.*, u."unitNumber" FROM "Lease" l JOIN "Unit" u ON l."unitId" = u.id WHERE l.status IN (\'ACTIVE\', \'PENDING\');');
    console.log(`Analyzing ${leasesRes.rows.length} active/pending leases...`);
    
    for (const lease of leasesRes.rows) {
      const start = new Date(lease.startDate);
      const startEt = toEthiopian(start);
      const maxDays = getDaysInEthiopianMonth(startEt.year, startEt.month);
      
      if (startEt.day === maxDays) {
        console.log(`\nFound Lease starting on last day of month:`);
        console.log(`  Unit: ${lease.unitNumber}`);
        console.log(`  Lease ID: ${lease.id}`);
        console.log(`  Start Date: ${lease.startDate.toISOString()} (${startEt.year}-${startEt.month}-${startEt.day})`);
        
        // Fetch approved payments
        const paymentsRes = await pool.query('SELECT * FROM "Payment" WHERE "leaseId" = $1 AND status = \'APPROVED\' ORDER BY "dueDate" ASC;', [lease.id]);
        console.log(`  Approved Payments (${paymentsRes.rows.length}):`);
        for (const p of paymentsRes.rows) {
          const dueEt = toEthiopian(new Date(p.dueDate));
          const advEt = p.advanceUntil ? toEthiopian(new Date(p.advanceUntil)) : null;
          console.log(`    - ID: ${p.id}, dueDate: ${p.dueDate.toISOString()} (${dueEt.year}-${dueEt.month}-${dueEt.day}), advanceUntil: ${p.advanceUntil ? p.advanceUntil.toISOString() : 'null'} (${advEt ? advEt.year + '-' + advEt.month + '-' + advEt.day : 'null'})`);
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
