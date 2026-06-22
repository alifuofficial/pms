const { addEthiopianMonths, toEthiopian, getEthiopianMonthEnd, getDaysInEthiopianMonth } = require("../src/lib/calendar");
const Kenat = require("kenat");

function getLeaseArrearMonths(leaseStart, approvedPayments) {
  const now = new Date("2026-05-26T06:26:10.877Z"); // the paidAt date of GD11 payment
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

function simulateApproval(unitName, leaseStartDateStr, paymentDueDateStr, amount, settings) {
  const leaseStartDate = new Date(leaseStartDateStr);
  const currentPayment = {
    amount: amount,
    dueDate: new Date(paymentDueDateStr)
  };
  
  const approvedPayments = [];
  const gapMonths = getLeaseArrearMonths(leaseStartDate, approvedPayments);
  gapMonths.sort((a, b) => a.getTime() - b.getTime());

  console.log(`\n--- Simulating ${unitName} ---`);
  console.log(`Lease start date: ${leaseStartDateStr} (${toEthiopian(leaseStartDate).toString()})`);
  console.log(`Gap months:`, gapMonths.map(g => `${g.toISOString()} (${toEthiopian(g).toString()})`));

  const monthlyRent = amount;
  let fundsRemaining = amount;
  let monthsCovered = 0;
  let clearedAllArrears = true;

  for (const gd of gapMonths) {
    if (fundsRemaining <= 0) {
      clearedAllArrears = false;
      break;
    }
    
    // Check penalty
    // Since we don't have settings, let's assume no penalty for this simulation or define a default one
    const startEt = toEthiopian(leaseStartDate);
    const gdEt = toEthiopian(gd);
    const isStartMonth = gdEt.year === startEt.year && gdEt.month === startEt.month;
    
    // Let's assume penalty is 0 for simplicity if no penalty is in DB
    const penaltyAmount = 0;
    
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

  console.log(`Months Covered: ${monthsCovered}`);
  console.log(`Funds Remaining (Advance Balance): ${fundsRemaining}`);

  let currentCoverageEnd;
  if (approvedPayments.length > 0) {
    // ...
  } else {
    const startEt = toEthiopian(leaseStartDate);
    const maxDays = getDaysInEthiopianMonth(startEt.year, startEt.month);
    if (startEt.day === maxDays) {
      currentCoverageEnd = leaseStartDate;
    } else {
      currentCoverageEnd = addEthiopianMonths(leaseStartDate, -1);
    }
  }

  console.log(`currentCoverageEnd: ${currentCoverageEnd.toISOString()} (${toEthiopian(currentCoverageEnd).toString()})`);

  let finalAdvanceUntil = currentCoverageEnd;
  if (monthsCovered > 0) {
    finalAdvanceUntil = addEthiopianMonths(currentCoverageEnd, monthsCovered);
  }

  console.log(`finalAdvanceUntil: ${finalAdvanceUntil.toISOString()} (${toEthiopian(finalAdvanceUntil).toString()})`);
}

simulateApproval("GD11", "2026-04-08T18:00:00.000Z", "2026-04-08T21:00:00.000Z", 9000);
simulateApproval("GD8", "2026-04-09T09:00:00.000Z", "2026-04-09T12:00:00.000Z", 9000);
