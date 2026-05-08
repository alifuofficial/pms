const Database = require('better-sqlite3');
const db = new Database('dev.db');

const query = `
  UPDATE Payment 
  SET penaltyAmount = 0, penaltyTier = 0, penaltyPaid = 0 
  WHERE id IN (
    SELECT Payment.id 
    FROM Payment 
    JOIN Lease ON Payment.leaseId = Lease.id 
    JOIN Unit ON Lease.unitId = Unit.id 
    WHERE Unit.unitNumber IN ('001', '003')
  )
`;

const result = db.prepare(query).run();
console.log(`Cleared ${result.changes} penalty records.`);

db.close();
