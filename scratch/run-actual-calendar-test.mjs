import { addEthiopianMonths, toEthiopian } from "../src/lib/calendar.ts";

const startDate = new Date("2026-04-08T18:00:00.000Z");
console.log("startDate:", startDate.toISOString());
console.log("toEthiopian:", toEthiopian(startDate).toString());

const nextMonth = addEthiopianMonths(startDate, 1);
console.log("nextMonth:", nextMonth.toISOString());
console.log("toEthiopian(nextMonth):", toEthiopian(nextMonth).toString());
