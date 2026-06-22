import { toEthiopian } from "../src/lib/calendar.ts";

const date = new Date("2026-06-18T12:00:00.000Z");
const et = toEthiopian(date);
console.log("Ethiopian date:", JSON.stringify(et, null, 2));
console.log("day:", et.day);
console.log("month:", et.month);
console.log("year:", et.year);
