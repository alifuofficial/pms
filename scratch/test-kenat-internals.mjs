import Kenat from "kenat";

const date1 = new Date("2026-04-08T18:00:00.000Z");

const timezones = ["UTC", "Asia/Tokyo", "America/New_York"];

for (const tz of timezones) {
  process.env.TZ = tz;
  const k = new Kenat(date1);
  const et = k.getEthiopian();
  console.log(`TZ: ${tz}`);
  console.log("k keys:", Object.keys(k));
  console.log("k object representation:", k);
  console.log(`  getEthiopian: ${et.year}-${et.month}-${et.day}`);
}
