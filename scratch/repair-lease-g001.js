const Database = require('better-sqlite3');
const db = new Database('dev.db');

try {
  console.log("=== STARTING REPAIR FOR LEASE cmpizej8m001r9ktcb8dmj5xp ===");

  // 1. Delete duplicate March penalty
  const deleteResult = db.prepare("DELETE FROM Penalty WHERE id = 'cmpj0wbka00229ktc3x27mg9t'").run();
  console.log("Deleted duplicate March penalty:", deleteResult);

  // 2. Update payment cmpj0w3wn00219ktcs740xk5q advanceUntil to June 7, 2026 (Ginbot 30)
  // Let's use the UTC date for June 7, 2026
  const updatePaymentResult = db.prepare(`
    UPDATE Payment 
    SET advanceUntil = '2026-06-07T21:00:00.000+00:00' 
    WHERE id = 'cmpj0w3wn00219ktcs740xk5q'
  `).run();
  console.log("Updated payment advanceUntil to June 7:", updatePaymentResult);

  // 3. Update lease advanceBalance to 0
  const updateLeaseResult = db.prepare(`
    UPDATE Lease 
    SET advanceBalance = 0 
    WHERE id = 'cmpizej8m001r9ktcb8dmj5xp'
  `).run();
  console.log("Updated lease advanceBalance to 0:", updateLeaseResult);

  console.log("=== REPAIR COMPLETE ===");
} catch (error) {
  console.error("Repair failed:", error);
} finally {
  db.close();
}
