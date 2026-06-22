import Kenat from "kenat";

function toEthiopian(date) {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const addisDate = new Date(normalized.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
  return new Kenat(addisDate).getEthiopian();
}

function getDaysInEthiopianMonth(year, month) {
  if (month < 13) return 30;
  const isLeap = (year + 1) % 4 === 0;
  return isLeap ? 6 : 5;
}

function getEthiopianMonthEnd(date) {
  const etDate = toEthiopian(date);
  const lastDay = getDaysInEthiopianMonth(etDate.year, etDate.month);
  const lastDayEt = new Kenat({ year: etDate.year, month: etDate.month, day: lastDay });
  const greg = lastDayEt.getGregorian();
  return new Date(greg.year, greg.month - 1, greg.day, 12, 0, 0);
}

const d1 = new Date("2026-04-08");
const d2 = new Date("2026-04-09");
const today = new Date("2026-06-09");

console.log("April 8, 2026:", toEthiopian(d1));
console.log("April 9, 2026:", toEthiopian(d2));
console.log("June 9, 2026 (today):", toEthiopian(today));

console.log("\nMonth end for April 8, 2026:", getEthiopianMonthEnd(d1).toISOString().slice(0, 10));
console.log("Month end for April 9, 2026:", getEthiopianMonthEnd(d2).toISOString().slice(0, 10));
