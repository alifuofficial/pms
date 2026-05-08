const Database = require('better-sqlite3');
const db = new Database('dev.db');

const query = `
  SELECT 
    Payment.id,
    Payment.dueDate, 
    Payment.paidAt,
    Payment.amount,
    Unit.rentAmount
  FROM Payment 
  JOIN Lease ON Payment.leaseId = Lease.id 
  JOIN Unit ON Lease.unitId = Unit.id 
  WHERE Payment.status = 'APPROVED' AND Payment.penaltyAmount = 0
`;

const rows = db.prepare(query).all();
console.log(`Checking ${rows.length} approved payments for missing penalties...`);

const updates = [];
for (const r of rows) {
  if (!r.paidAt) continue;
  
  const dueDate = new Date(r.dueDate);
  const paidAt = new Date(r.paidAt);
  const diffTime = paidAt.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let penalty = 0;
  let tier = 0;
  if (diffDays > 12) {
    penalty = r.rentAmount * 0.10;
    tier = 2;
  } else if (diffDays > 5) {
    penalty = r.rentAmount * 0.05;
    tier = 1;
  }

  if (penalty > 0) {
    console.log(`Payment ${r.id} is late by ${diffDays} days. Applying ${penalty} penalty.`);
    updates.push({ id: r.id, penaltyAmount: penalty, penaltyTier: tier });
  }
}

if (updates.length > 0) {
  const stmt = db.prepare('UPDATE Payment SET penaltyAmount = ?, penaltyTier = ?, penaltyPaid = 0 WHERE id = ?');
  const transaction = db.transaction((data) => {
    for (const u of data) {
      stmt.run(u.penaltyAmount, u.penaltyTier, u.id);
    }
  });
  transaction(updates);
  console.log(`Updated ${updates.length} payments with penalties.`);
} else {
  console.log('No missing penalties found.');
}

db.close();
