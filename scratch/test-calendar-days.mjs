import { getDaysUntilEthiopianExpiry, toEthiopian } from '../src/lib/calendar.ts';

const advanceUntil = new Date("2026-07-08T21:00:00.000Z");
console.log("advanceUntil:", advanceUntil.toISOString());
console.log("In Ethiopian:", toEthiopian(advanceUntil));

const daysLeft = getDaysUntilEthiopianExpiry(advanceUntil);
console.log("Days left:", daysLeft);
