const Database = require('better-sqlite3');
const db = new Database('dev.db');

console.log("=== UNITS matching G003 or 003 ===");
const units = db.prepare(`SELECT * FROM Unit WHERE unitNumber LIKE '%003%'`).all();
console.log(JSON.stringify(units, null, 2));

if (units.length > 0) {
  const unitIds = units.map(u => `'${u.id}'`).join(',');
  console.log("\n=== LEASES for these units ===");
  const leases = db.prepare(`SELECT * FROM Lease WHERE unitId IN (${unitIds})`).all();
  console.log(JSON.stringify(leases, null, 2));

  if (leases.length > 0) {
    const leaseIds = leases.map(l => `'${l.id}'`).join(',');
    console.log("\n=== PAYMENTS for these leases ===");
    const payments = db.prepare(`SELECT * FROM Payment WHERE leaseId IN (${leaseIds})`).all();
    console.log(JSON.stringify(payments, null, 2));

    console.log("\n=== PENALTIES for these leases ===");
    const penalties = db.prepare(`SELECT * FROM Penalty WHERE leaseId IN (${leaseIds})`).all();
    console.log(JSON.stringify(penalties, null, 2));
  }
}

db.close();
