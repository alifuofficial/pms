const Database = require('better-sqlite3');
const db = new Database('dev.db');

const ids = ["cmovhgf5y000594tcq2oq91pl", "cmovhrrwm000b94tc7wty62me", "cmovpengl000n94tcg1gbj5n9"];
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
  WHERE Payment.id IN (${ids.map(id => `'${id}'`).join(',')})
`;

const rows = db.prepare(query).all();
console.log(JSON.stringify(rows, null, 2));

db.close();
