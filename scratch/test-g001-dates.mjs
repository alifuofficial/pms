import Kenat from "kenat";

const etDate = new Kenat({ year: 2018, month: 8, day: 30 });
console.log("Miyazya 30, 2018 Gregorian:", etDate.getGregorian());

const etToday = new Kenat(new Date("2026-05-24T12:00:00"));
console.log("May 24, 2026 Ethiopian:", etToday.getEthiopian());

// Today is Ginbot 15, 2018
// Miyazya 30 is month 8 day 30.
// Ginbot 15 is month 9 day 15.
// Difference in months/days:
// From Miyazya 30 to Ginbot 15 is exactly 15 days!
// Let's print out what Kenat does for these dates.
const miyazya30 = new Kenat({ year: 2018, month: 8, day: 30 }).getGregorian();
const ginbot15 = new Kenat({ year: 2018, month: 9, day: 15 }).getGregorian();

console.log("Miyazya 30 Gregorian:", miyazya30);
console.log("Ginbot 15 Gregorian:", ginbot15);

const diffMs = new Date(ginbot15.year, ginbot15.month - 1, ginbot15.day).getTime() - new Date(miyazya30.year, miyazya30.month - 1, miyazya30.day).getTime();
console.log("Diff in days from Gregorian:", diffMs / (1000 * 60 * 60 * 24));
