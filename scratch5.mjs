import Kenat from "kenat";

const leaseStart = new Date("2026-02-07T21:00:00.000Z"); // Feb 7, 21:00 UTC
const now = new Date("2026-05-11T12:00:00.000Z");

const payments = [
  { status: "APPROVED", dueDate: "2026-02-07T21:00:00.000Z", advanceUntil: null }
];

export function toEthiopian(date) {
  const addisDate = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
  return new Kenat(addisDate).getEthiopian();
}

function getArrearMonths(leaseStart, payments) {
  const arrears = [];
  const coveredMonthKeys = new Set();
  const approvedPayments = payments.filter(p => p.status === "APPROVED");
  
  for (const p of approvedPayments) {
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
  return arrears;
}

console.log(getArrearMonths(leaseStart, payments));
