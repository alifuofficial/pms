import Kenat from 'kenat';

// Ginbot 1, 2018 EC is May 9, 2026 GC
const ginbot1 = new Date(2026, 4, 9); // May 9 is 0-indexed month 4
console.log("May 9, 2026 as Ethiopian Date:");
const etStart = new Kenat(ginbot1).getEthiopian();
console.log(etStart); // should be { year: 2018, month: 9, day: 1 }

// Let's find end of Ginbot (Month 9)
const endGinbot = new Kenat({ year: 2018, month: 9, day: 30 }).getGregorian();
console.log("\nEnd of Ginbot (Month 9):", new Date(endGinbot.year, endGinbot.month - 1, endGinbot.day).toDateString());

// End of Sene (Month 10)
const endSene = new Kenat({ year: 2018, month: 10, day: 30 }).getGregorian();
console.log("End of Sene (Month 10):", new Date(endSene.year, endSene.month - 1, endSene.day).toDateString());

// End of Hamle (Month 11)
const endHamle = new Kenat({ year: 2018, month: 11, day: 30 }).getGregorian();
console.log("End of Hamle (Month 11):", new Date(endHamle.year, endHamle.month - 1, endHamle.day).toDateString());
