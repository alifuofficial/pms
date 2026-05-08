const Database = require('better-sqlite3');
const db = new Database('dev.db');

const query = `
  SELECT 
    Payment.id,
    Payment.dueDate, 
    Payment.amount,
    Payment.penaltyAmount,
    Payment.penaltyPaid,
    Unit.rentAmount, 
    User.name as tenantName
  FROM Payment 
  JOIN Lease ON Payment.leaseId = Lease.id 
  JOIN Unit ON Lease.unitId = Unit.id 
  JOIN User ON Payment.tenantId = User.id 
  WHERE Payment.status = 'PENDING'
`;

const rows = db.prepare(query).all();
const now = new Date();

const overdueWithPenalty = rows.map(r => {
  const dueDate = new Date(r.dueDate);
  const diffTime = now.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let calculatedPenalty = 0;
  if (diffDays > 12) calculatedPenalty = r.rentAmount * 0.10;
  else if (diffDays > 5) calculatedPenalty = r.rentAmount * 0.05;

  return {
    ...r,
    diffDays,
    calculatedPenalty
  };
}).filter(r => r.calculatedPenalty > 0 || r.penaltyAmount > 0);

console.log(JSON.stringify(overdueWithPenalty, null, 2));

db.close();
