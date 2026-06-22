const Database = require('better-sqlite3');
const db = new Database('dev.db');

console.log("=== UNIT DETAILS ===");
const unit = db.prepare("SELECT * FROM Unit WHERE unitNumber = 'G001'").get();
console.log(JSON.stringify(unit, null, 2));

if (unit) {
  console.log("\n=== LEASE DETAILS ===");
  const leases = db.prepare("SELECT * FROM Lease WHERE unitId = ?").all(unit.id);
  console.log(JSON.stringify(leases, null, 2));

  for (const lease of leases) {
    console.log(`\n=== PAYMENTS FOR LEASE ${lease.id} ===`);
    const payments = db.prepare("SELECT * FROM Payment WHERE leaseId = ? ORDER BY dueDate ASC").all(lease.id);
    console.log(JSON.stringify(payments, null, 2));

    console.log(`\n=== PENALTIES FOR LEASE ${lease.id} ===`);
    const penalties = db.prepare("SELECT * FROM Penalty WHERE leaseId = ? ORDER BY dueDate ASC").all(lease.id);
    console.log(JSON.stringify(penalties, null, 2));
  }
}

db.close();
