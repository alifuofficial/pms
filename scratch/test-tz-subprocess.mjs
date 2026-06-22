import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const timezones = ["UTC", "Asia/Tokyo", "America/New_York", "Africa/Nairobi"];

const testCode = `
import Kenat from "kenat";

function toEthiopianOriginal(date) {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const addisDate = new Date(normalized.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
  return new Kenat(addisDate).getEthiopian();
}

function toEthiopianFixedUTC(date) {
  // Addis Ababa is UTC+3. We can format the date in UTC+3 timezone directly using Intl.DateTimeFormat!
  // This is 100% timezone-independent and doesn't rely on local getters!
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });
  
  const parts = fmt.formatToParts(date);
  const partMap = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }
  
  const year = parseInt(partMap.year);
  const month = parseInt(partMap.month);
  const day = parseInt(partMap.day);
  
  const gregDate = new Date(year, month - 1, day, 12, 0, 0);
  return new Kenat(gregDate).getEthiopian();
}

const testDates = [
  "2026-04-08T18:00:00.000Z", // 9 PM Addis -> Megabit 30
  "2026-04-08T22:00:00.000Z", // 1 AM Addis -> Miazia 1
  "2026-04-09T09:00:00.000Z"  // 12 PM Addis -> Miazia 1
];

for (const utc of testDates) {
  const d = new Date(utc);
  const orig = toEthiopianOriginal(d);
  const fixed = toEthiopianFixedUTC(d);
  
  console.log("  Input: " + utc);
  console.log("    Original: " + orig.year + "-" + orig.month + "-" + orig.day);
  console.log("    Fixed:    " + fixed.year + "-" + fixed.month + "-" + fixed.day);
}
`;

fs.writeFileSync("scratch/temp-tz-test.mjs", testCode);

for (const tz of timezones) {
  console.log(`\n=================== Server TZ: ${tz} ===================`);
  const res = spawnSync("node", ["scratch/temp-tz-test.mjs"], {
    env: { ...process.env, TZ: tz },
    encoding: "utf-8"
  });
  console.log(res.stdout);
  if (res.stderr) {
    console.error("Error:", res.stderr);
  }
}

try {
  fs.unlinkSync("scratch/temp-tz-test.mjs");
} catch (e) {}
