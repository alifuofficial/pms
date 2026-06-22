const fs = require('fs');

const content = fs.readFileSync('src/app/u/[slug]/page.tsx', 'utf8');

// Mock data representing the paid state of G001 / G003
const lease = {
  id: "lease-id",
  status: "ACTIVE",
  tenantName: "Alifu Hjai",
  advanceBalance: 0,
  pendingAmount: 0,
  daysLeft: 45,
  arrearsMonths: [],
  arrearsCount: 0,
  grandTotal: 0,
  unpaidPenaltyTotal: 0,
  unpaidPenalties: [],
  nextDuePayment: null,
  latestApprovedPayment: {
    id: "payment-id",
    dueDate: "2026-05-09T12:00:00.000+00:00",
    advanceUntil: "2026-07-08T21:00:00.000Z"
  }
};

const unit = {
  id: "unit-id",
  unitNumber: "G001",
  rentAmount: 100
};

const settings = {
  currency: "ETB"
};

const status = "PAID";
const statusLabel = "PAID";

// Find all curly braced blocks in the file
const matches = content.match(/\{[^{}]+\}/g) || [];
console.log("Evaluating JSX expressions...");

matches.forEach((expr, idx) => {
  const code = expr.slice(1, -1);
  if (code.includes('/*') || code.includes('//')) return; // skip comments
  
  try {
    // We execute the expression in a secure sandbox function
    const fn = new Function('lease', 'unit', 'settings', 'status', 'statusLabel', `return (${code});`);
    const val = fn(lease, unit, settings, status, statusLabel);
    
    // Check if the value is exactly 0
    if (val === 0) {
      console.log(`Expression #${idx + 1} evaluates to 0!`);
      console.log(`Code: ${code.trim()}`);
      console.log("------------------------");
    }
  } catch (err) {
    // Ignore errors for expressions referencing undefined local variables like format, etc.
  }
});
