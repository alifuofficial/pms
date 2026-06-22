const { toEthiopian, getEthiopianMonthEnd, getDaysInEthiopianMonth, addEthiopianMonths } = require("../src/lib/calendar");
const Kenat = require("kenat");

function getLeaseArrearMonths(leaseStart, approvedPayments) {
  const now = new Date("2026-06-12T05:59:30.939Z"); // Date when payment was approved
  const arrears = [];
  const coveredMonthKeys = new Set();
  
  for (const p of approvedPayments) {
    let startEt = toEthiopian(new Date(p.dueDate));
    const endEt = toEthiopian(p.advanceUntil ? new Date(p.advanceUntil) : new Date(p.dueDate));
    
    if (p.advanceUntil) {
      if (startEt.year > endEt.year || (startEt.year === endEt.year && startEt.month > endEt.month)) {
        startEt = endEt;
      }
    }
    
    let tempYear = startEt.year;
    let tempMonth = startEt.month;
    let iterations = 0;
    while (iterations < 60) {
      coveredMonthKeys.add(`${tempYear}-${tempMonth}`);
      if (tempYear === endEt.year && tempMonth === endEt.month) break;
      tempMonth++;
      if (tempMonth > 13) { tempMonth = 1; tempYear++; }
      iterations++;
    }
  }

  const startEt = toEthiopian(leaseStart);
  const nowEt = toEthiopian(now);

  console.log("startEt:", startEt);
  console.log("nowEt:", nowEt);

  let tempYear = startEt.year;
  let tempMonth = startEt.month;
  
  const maxDays = getDaysInEthiopianMonth(tempYear, tempMonth);
  if (startEt.day === maxDays) {
    tempMonth++;
    if (tempMonth > 13) {
      tempMonth = 1;
      tempYear++;
    }
  }

  let iterations = 0;
  
  while (iterations < 60) {
    const key = `${tempYear}-${tempMonth}`;
    
    if (!coveredMonthKeys.has(key)) {
      const etDateObj = new Kenat({ year: tempYear, month: tempMonth, day: 1 });
      const greg = etDateObj.getGregorian();
      arrears.push(new Date(Date.UTC(greg.year, greg.month - 1, greg.day, 12, 0, 0)));
    }
    
    if (tempYear === nowEt.year && tempMonth === nowEt.month) break;
    tempMonth++;
    if (tempMonth > 13) { tempMonth = 1; tempYear++; }
    iterations++;
  }

  return arrears;
}

const leaseStart = new Date("2026-04-08T18:00:00.000Z");
const approvedPayments = [
  {
    dueDate: "2026-04-08T21:00:00.000Z",
    advanceUntil: "2026-05-07T21:00:00.000Z"
  }
];

const gapMonths = getLeaseArrearMonths(leaseStart, approvedPayments);
console.log("gapMonths:", gapMonths.map(d => d.toISOString().slice(0, 10)));
