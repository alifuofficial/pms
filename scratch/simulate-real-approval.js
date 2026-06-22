const { Pool } = require("pg");
const Kenat = require("kenat");
require("dotenv").config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

function toEthiopian(date) {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const addisDate = new Date(normalized.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
  return new Kenat(addisDate).getEthiopian();
}

function getDaysInEthiopianMonth(year, month) {
  if (month < 13) return 30;
  const isLeap = (year + 1) % 4 === 0;
  return isLeap ? 6 : 5;
}

function addEthiopianMonths(date, monthsToAdd) {
  const etDate = toEthiopian(date);
  let newYear = etDate.year;
  let newMonth = etDate.month + monthsToAdd;

  while (newMonth > 13) {
    newMonth -= 13;
    newYear++;
  }
  
  const maxDays = getDaysInEthiopianMonth(newYear, newMonth);
  const newDay = Math.min(etDate.day, maxDays);

  const newEtObj = new Kenat({ year: newYear, month: newMonth, day: newDay });
  const greg = newEtObj.getGregorian();
  return new Date(greg.year, greg.month - 1, greg.day);
}

function getEthiopianMonthEnd(date) {
  const etDate = toEthiopian(date);
  const lastDay = getDaysInEthiopianMonth(etDate.year, etDate.month);
  const lastDayEt = new Kenat({ year: etDate.year, month: etDate.month, day: lastDay });
  const greg = lastDayEt.getGregorian();
  return new Date(greg.year, greg.month - 1, greg.day, 12, 0, 0);
}

function hasLatePenalty(dueDate, settings, now) {
  if (!settings?.lateFeeEnabled) return false;

  const nowEt = toEthiopian(now);
  const dueEt = toEthiopian(dueDate);

  if (nowEt.year > dueEt.year) return true;
  if (nowEt.year === dueEt.year) {
    if (nowEt.month > dueEt.month) return true;
    if (nowEt.month === dueEt.month) {
      return nowEt.day >= 6;
    }
  }
  return false;
}

function getLeaseArrearMonths(leaseStart, approvedPayments, now) {
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

async function run() {
  const pool = new Pool({ connectionString });
  try {
    const paymentId = "cmpm8p9v1002m2fny7h2idi72";
    const paymentRes = await pool.query('SELECT * FROM "Payment" WHERE id = $1;', [paymentId]);
    const currentPayment = paymentRes.rows[0];
    
    const leaseRes = await pool.query('SELECT * FROM "Lease" WHERE id = $1;', [currentPayment.leaseId]);
    const lease = leaseRes.rows[0];
    
    const unitRes = await pool.query('SELECT * FROM "Unit" WHERE id = $1;', [lease.unitId]);
    const unit = unitRes.rows[0];
    
    const settingsRes = await pool.query('SELECT * FROM "SystemSettings" WHERE id = \'global\';');
    const settings = settingsRes.rows[0];
    
    console.log("PAYMENT:", currentPayment);
    console.log("LEASE:", lease);
    console.log("UNIT:", unit);
    console.log("SETTINGS:", settings);

    const approvedPayments = [];
    const now = new Date(currentPayment.createdAt); // Simulate at approval/creation time
    
    const gapMonths = getLeaseArrearMonths(new Date(lease.startDate), approvedPayments, now);
    gapMonths.sort((a, b) => a.getTime() - b.getTime());
    
    console.log("\nGAP MONTHS:", gapMonths.map(g => `${g.toISOString()} (${toEthiopian(g).toString()})`));
    
    const monthlyRent = unit.rentAmount;
    let fundsRemaining = currentPayment.amount + lease.advanceBalance;
    let actualPenaltyPaid = 0;
    let monthsCovered = 0;
    
    let clearedAllArrears = true;
    for (const gd of gapMonths) {
      if (fundsRemaining <= 0) {
        clearedAllArrears = false;
        break;
      }
      
      const leaseStartDate = new Date(lease.startDate);
      const startEt = toEthiopian(leaseStartDate);
      const gdEt = toEthiopian(gd);
      const isStartMonth = gdEt.year === startEt.year && gdEt.month === startEt.month;
      
      const hasPenalty = hasLatePenalty(gd, settings, now) && !(isStartMonth && approvedPayments.length === 0);
      const penaltyAmount = hasPenalty ? (monthlyRent * ((settings?.lateFeePercentage || 5) / 100)) : 0;
      
      console.log(`Evaluating gap month: ${gd.toISOString()} (${toEthiopian(gd).toString()})`);
      console.log(`  hasPenalty: ${hasPenalty}, penaltyAmount: ${penaltyAmount}`);
      
      if (penaltyAmount > 0) {
        const toPay = Math.min(penaltyAmount, fundsRemaining);
        actualPenaltyPaid += toPay;
        fundsRemaining -= toPay;
      }
      
      if (fundsRemaining >= monthlyRent) {
        fundsRemaining -= monthlyRent;
        monthsCovered++;
      } else {
        clearedAllArrears = false;
        break;
      }
    }
    
    if (clearedAllArrears && fundsRemaining >= monthlyRent) {
      const extraMonths = Math.floor(fundsRemaining / monthlyRent);
      monthsCovered += extraMonths;
      fundsRemaining = fundsRemaining % monthlyRent;
    }
    
    console.log("\nSIMULATION RESULTS:");
    console.log("Months Covered:", monthsCovered);
    console.log("Actual Penalty Paid:", actualPenaltyPaid);
    console.log("Funds Remaining:", fundsRemaining);
    
    let currentCoverageEnd;
    const startEt = toEthiopian(new Date(lease.startDate));
    const maxDays = getDaysInEthiopianMonth(startEt.year, startEt.month);
    if (startEt.day === maxDays) {
      currentCoverageEnd = new Date(lease.startDate);
    } else {
      currentCoverageEnd = addEthiopianMonths(new Date(lease.startDate), -1);
    }
    
    console.log("currentCoverageEnd:", currentCoverageEnd.toISOString(), `(${toEthiopian(currentCoverageEnd).toString()})`);
    
    let finalAdvanceUntil = currentCoverageEnd;
    if (monthsCovered > 0) {
      finalAdvanceUntil = addEthiopianMonths(new Date(currentCoverageEnd), monthsCovered);
    }
    
    console.log("finalAdvanceUntil:", finalAdvanceUntil.toISOString(), `(${toEthiopian(finalAdvanceUntil).toString()})`);
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
