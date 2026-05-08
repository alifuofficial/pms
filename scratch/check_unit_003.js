const Database = require('better-sqlite3');
const db = new Database('dev.db');

const query = `
  SELECT 
    Payment.id, 
    Unit.unitNumber, 
    Payment.dueDate, 
    Payment.paidAt,
    Payment.penaltyAmount
  FROM Payment 
  JOIN Lease ON Payment.leaseId = Lease.id 
  JOIN Unit ON Lease.unitId = Unit.id 
  WHERE Unit.unitNumber = '003'
`;

const rows = db.prepare(query).all();
console.log(JSON.stringify(rows, null, 2));

db.close();
