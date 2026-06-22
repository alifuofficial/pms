import Kenat from "kenat";

function toEthiopianFixed(date) {
  // Shift by 3 hours to align with Addis Ababa (UTC+3)
  const addisMs = date.getTime() + (3 * 60 * 60 * 1000);
  const addisDate = new Date(addisMs);
  
  // Pass the shifted date directly. Kenat parses the Date object using its UTC fields.
  return new Kenat(addisDate).getEthiopian();
}

const testDates = [
  { utc: "2026-04-08T18:00:00.000Z", expected: "2018-7-30" }, // 9 PM Addis -> Megabit 30
  { utc: "2026-04-08T22:00:00.000Z", expected: "2018-8-1" },  // 1 AM Addis (next day) -> Miazia 1
  { utc: "2026-04-09T09:00:00.000Z", expected: "2018-8-1" }   // 12 PM Addis -> Miazia 1
];

const timezones = ["UTC", "Asia/Tokyo", "America/New_York", "Africa/Nairobi"];

let allPassed = true;

for (const tz of timezones) {
  console.log(`\nTesting under server TZ: ${tz}`);
  process.env.TZ = tz;
  
  for (const { utc, expected } of testDates) {
    const d = new Date(utc);
    const et = toEthiopianFixed(d);
    const actual = `${et.year}-${et.month}-${et.day}`;
    
    console.log(`  Input: ${utc} -> Actual: ${actual}, Expected: ${expected}`);
    if (actual !== expected) {
      console.log("  [FAILED]");
      allPassed = false;
    }
  }
}

if (allPassed) {
  console.log("\nALL TESTS PASSED! Shifting UTC timestamp by +3 hours is 100% correct and timezone-independent!");
} else {
  console.log("\nSOME TESTS FAILED.");
}
