// Simple calendar and timezone math test script
const Kenat = require('kenat').default || require('kenat');

// 1. Timezone offset math validation
function getNowInAddisAbaba() {
  const utc = new Date();
  return new Date(utc.getTime() + 3 * 60 * 60 * 1000);
}

function getEthiopianMonthEnd(date) {
  try {
    const addisDate = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
    const etDate = new Kenat(addisDate).getEthiopian();
    const lastDay = etDate.month < 13 ? 30 : ((etDate.year + 1) % 4 === 0 ? 6 : 5);
    const lastDayEt = new Kenat({ year: etDate.year, month: etDate.month, day: lastDay });
    const greg = lastDayEt.getGregorian();
    return new Date(greg.year, greg.month - 1, greg.day);
  } catch (error) {
    console.error("Error getEthiopianMonthEnd:", error);
    return null;
  }
}

function getDaysPastEthiopianExpiry(expiryDate, mockNow) {
  const now = mockNow || getNowInAddisAbaba();
  const monthEnd = getEthiopianMonthEnd(expiryDate);
  
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate());
  
  const diffMs = nowDay.getTime() - endDay.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

console.log("--- START CALENDAR MATH TESTS ---");

// Mocking Meskerem 30 (October 10, 2025 in Gregorian)
const expiry = new Date(2025, 9, 10); // Oct 10 is index 9 in JS month (0-indexed)

console.log("Prepaid Expiry Date:", expiry.toDateString());
console.log("Ethiopian Expiry Month End:", getEthiopianMonthEnd(expiry).toDateString());

// Test boundaries:
// Expiry day (Oct 10 / Meskerem 30) -> 0 days past
console.log("On Expiry Day (Oct 10):", getDaysPastEthiopianExpiry(expiry, new Date(2025, 9, 10)), "days past (Expected: 0)");

// Grace Period Day 1 (Oct 11 / Tikimt 1) -> 1 day past
console.log("Grace Day 1 (Oct 11):", getDaysPastEthiopianExpiry(expiry, new Date(2025, 9, 11)), "days past (Expected: 1)");

// Grace Period Day 5 (Oct 15 / Tikimt 5) -> 5 days past
console.log("Grace Day 5 (Oct 15):", getDaysPastEthiopianExpiry(expiry, new Date(2025, 9, 15)), "days past (Expected: 5)");

// Overdue Day 6 (Oct 16 / Tikimt 6) -> 6 days past (Penalty starts!)
console.log("Overdue Day 6 (Oct 16):", getDaysPastEthiopianExpiry(expiry, new Date(2025, 9, 16)), "days past (Expected: 6)");

console.log("--- TESTS COMPLETED ---");
