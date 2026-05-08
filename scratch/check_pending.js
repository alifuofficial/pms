const Database = require('better-sqlite3');
const db = new Database('dev.db');

const rows = db.prepare("SELECT Payment.dueDate, User.name FROM Payment JOIN User ON Payment.tenantId = User.id WHERE Payment.status = 'PENDING'").all();
console.log('Pending Payments:', rows);

db.close();
