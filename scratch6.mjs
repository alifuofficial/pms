import Kenat from "kenat";

function getDaysIntoEthiopianMonth(date) {
  const now = new Date("2026-05-11T12:00:00Z");
  const addisDate = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
  const etDate = new Kenat(addisDate).getEthiopian();
  const monthStartEt = new Kenat({ year: etDate.year, month: etDate.month, day: 1 });
  const gregStart = monthStartEt.getGregorian();
  
  const startDay = new Date(Date.UTC(gregStart.year, gregStart.month - 1, gregStart.day));
  const nowDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  
  const diffMs = nowDay.getTime() - startDay.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function calcMonthPenalty(dueDate, rentAmount, settings) {
  const diffDays = getDaysIntoEthiopianMonth(dueDate);
  if (!settings?.lateFeeEnabled || diffDays < 5) return { penalty: 0, penaltyTier: 0, diffDays };
  if (diffDays >= 35) {
    return { penalty: rentAmount * ((settings.warningFeePercentage || 10) / 100), penaltyTier: 2, diffDays };
  }
  return { penalty: rentAmount * ((settings.lateFeePercentage || 5) / 100), penaltyTier: 1, diffDays };
}

function toEthiopian(date) {
  const addisDate = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
  return new Kenat(addisDate).getEthiopian();
}

function getEthiopianMonthEnd(date) {
  const addisDate = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
  const etDate = new Kenat(addisDate).getEthiopian();
  const lastDayEt = new Kenat({ year: etDate.year, month: etDate.month, day: 30 }); // Simplified for test
  const greg = lastDayEt.getGregorian();
  return new Date(greg.year, greg.month - 1, greg.day);
}

const leaseStart = new Date("2026-02-08T12:00:00Z");
const payments = [
  { status: "APPROVED", dueDate: new Date("2026-02-08T12:00:00Z"), advanceUntil: null }
];
const now = new Date("2026-05-11T12:00:00Z");

const arrears = [];
const coveredMonthKeys = new Set();
for (const p of payments) {
  const start = new Date(p.dueDate);
  const end = p.advanceUntil ? new Date(p.advanceUntil) : start;
  let temp = toEthiopian(start);
  const endEt = toEthiopian(end);
  let iterations = 0;
  while (iterations < 60) {
    coveredMonthKeys.add(`${temp.year}-${temp.month}`);
    if (temp.year === endEt.year && temp.month === endEt.month) break;
    temp.month++;
    if (temp.month > 13) { temp.month = 1; temp.year++; }
    iterations++;
  }
}

let cursorEt = toEthiopian(leaseStart);
const nowEt = toEthiopian(now);
let iterations = 0;
while (iterations < 60) {
  const key = `${cursorEt.year}-${cursorEt.month}`;
  if (!coveredMonthKeys.has(key)) {
    const etDateObj = new Kenat({ year: cursorEt.year, month: cursorEt.month, day: 1 });
    const greg = etDateObj.getGregorian();
    arrears.push(new Date(greg.year, greg.month - 1, greg.day));
  }
  if (cursorEt.year === nowEt.year && cursorEt.month === nowEt.month) break;
  cursorEt.month++;
  if (cursorEt.month > 13) { cursorEt.month = 1; cursorEt.year++; }
  iterations++;
}

const pendingDueDates = new Set();
const unit = { rentAmount: 100 };
const settings = { lateFeeEnabled: true };

const arrearsMonths = arrears.filter(gd => !pendingDueDates.has(`${gd.getFullYear()}-${gd.getMonth()}`)).map(gd => {
  const { penalty, penaltyTier, diffDays } = calcMonthPenalty(gd, unit.rentAmount, settings);
  return {
    id: `gap-${gd.getFullYear()}-${gd.getMonth()}`,
    dueDate: gd,
    ethiopianDueDate: getEthiopianMonthEnd(gd),
    daysFromDue: diffDays,
    baseAmount: unit.rentAmount,
    penalty,
    penaltyTier,
    totalAmount: unit.rentAmount + penalty,
    status: "UNRECORDED",
    receiptUrl: null,
    isGap: true,
  };
});

console.log(JSON.stringify(arrearsMonths, null, 2));
