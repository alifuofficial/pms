const Kenat = require('kenat/dist/index.js'); // Import by direct path if main is not exported
// Wait, let's see if we can just require 'kenat' or require it using ESM.
// Let's check how calendar.ts imports it. It's typescript, compiled by next.
// Let's try importing it using different paths.
try {
  const K = require('kenat');
  console.log("imported direct");
} catch (e) {
  console.log(e.message);
}

const etDate = new Kenat.default({ year: 2018, month: 8, day: 30 });
console.log("Miyazya 30, 2018 Gregorian:", etDate.getGregorian());

const etToday = new Kenat.default(new Date("2026-05-24T12:00:00"));
console.log("May 24, 2026 Ethiopian:", etToday.getEthiopian());

const now = new Date("2026-05-24");
const end = new Date("2026-05-08"); // Miyazya 30
const diffTime = end.getTime() - now.getTime();
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
console.log("diffDays between May 8 and May 24:", diffDays);
