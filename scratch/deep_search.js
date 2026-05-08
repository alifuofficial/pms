const Database = require('better-sqlite3');
const db = new Database('dev.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for (const t of tables) {
  try {
    const rows = db.prepare(`SELECT * FROM ${t.name}`).all();
    for (const r of rows) {
      const str = JSON.stringify(r);
      // Look for 10% or just 10 in a context that looks like a penalty
      if (str.includes('"penaltyAmount":10') || str.includes('10%')) {
        console.log(`FOUND in ${t.name}:`, r);
      }
    }
  } catch (e) {}
}

db.close();
