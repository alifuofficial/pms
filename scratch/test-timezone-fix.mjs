import Kenat from "kenat";

function toEthiopianOriginal(date) {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const addisDate = new Date(normalized.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
  return new Kenat(addisDate).getEthiopian();
}

function toEthiopianFixed(date) {
  // date.getTime() is UTC epoch time. Addis Ababa is UTC+3.
  const addisMs = date.getTime() + (3 * 60 * 60 * 1000);
  const addisDate = new Date(addisMs);
  
  // Since we shifted the timestamp by +3 hours, getUTC* methods will give us Addis Ababa calendar fields.
  const year = addisDate.getUTCFullYear();
  const month = addisDate.getUTCMonth() + 1;
  const day = addisDate.getUTCDate();
  
  return new Kenat({ year, month, day }).getEthiopian();
}

const testDates = [
  new Date("2026-04-08T18:00:00.000Z"), // Megabit 30 (9:00 PM Addis)
  new Date("2026-04-08T22:00:00.000Z"), // Miazia 1 (1:00 AM Addis)
  new Date("2026-04-09T09:00:00.000Z")  // Miazia 1 (12:00 PM Addis)
];

const timezones = ["UTC", "Asia/Tokyo", "America/New_York", "Africa/Nairobi"];

for (const tz of timezones) {
  console.log(`\n=================== Server TZ: ${tz} ===================`);
  process.env.TZ = tz;
  
  for (const d of testDates) {
    const orig = toEthiopianOriginal(d);
    const fixed = toEthiopianFixed(d);
    
    console.log(`Input: ${d.toISOString()}`);
    console.log(`  Original: { year: ${orig.year}, month: ${orig.month}, day: ${orig.day} }`);
    console.log(`  Fixed:    { year: ${fixed.year}, month: ${fixed.month}, day: ${fixed.day} }`);
    
    if (orig.year !== fixed.year || orig.month !== fixed.month || orig.day !== fixed.day) {
      console.log("  [DISCREPANCY DETECTED!]");
    }
  }
}
