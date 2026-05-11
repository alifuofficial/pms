import Kenat from "kenat";

const now = new Date("2026-05-11T12:00:00Z");
const leaseStart = new Date("2026-02-08T12:00:00Z"); // Yekatit 1
const payments = [{ status: "APPROVED", dueDate: "2026-02-08T12:00:00Z", advanceUntil: "2026-03-09T12:00:00Z" }]; // Yekatit 1 to Yekatit 30

function toEthiopian(date) {
  const addisDate = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
  return new Kenat(addisDate).getEthiopian();
}

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
    arrears.push(new Date(Date.UTC(greg.year, greg.month - 1, greg.day, 12, 0, 0)));
  }
  if (cursorEt.year === nowEt.year && cursorEt.month === nowEt.month) break;
  cursorEt.month++;
  if (cursorEt.month > 13) { cursorEt.month = 1; cursorEt.year++; }
  iterations++;
}
console.log(arrears);
