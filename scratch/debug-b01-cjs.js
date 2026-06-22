const { PrismaClient } = require("@prisma/client");
const Kenat = require("kenat").default || require("kenat");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
    }
  }
});

// Replicate calendar helpers exactly as in production src/lib/calendar.ts
function getNowInAddisAbaba() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
}

function toEthiopian(date) {
  const addisDate = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
  return new Kenat(addisDate).getEthiopian();
}

function isEthiopianLeapYear(year) {
  return (year + 1) % 4 === 0;
}

function getDaysInEthiopianMonth(year, month) {
  if (month === 13) {
    return isEthiopianLeapYear(year) ? 6 : 5;
  }
  return 30;
}

function getEthiopianMonthEnd(date) {
  try {
    const addisDate = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
    const etDate = new Kenat(addisDate).getEthiopian();
    const lastDay = getDaysInEthiopianMonth(etDate.year, etDate.month);
    const lastDayEt = new Kenat({ year: etDate.year, month: etDate.month, day: lastDay });
    const greg = lastDayEt.getGregorian();
    return new Date(greg.year, greg.month - 1, greg.day);
  } catch (err) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1, 0);
    return d;
  }
}

function getDaysUntilEthiopianExpiry(expiryDate) {
  const now = getNowInAddisAbaba();
  const monthEnd = getEthiopianMonthEnd(expiryDate);
  const diffTime = monthEnd.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getDaysPastEthiopianExpiry(expiryDate) {
  const now = getNowInAddisAbaba();
  const monthEnd = getEthiopianMonthEnd(expiryDate);
  const diffTime = now.getTime() - monthEnd.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

function addEthiopianMonths(date, months) {
  const addisDate = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
  const etDate = new Kenat(addisDate).getEthiopian();
  let newMonth = etDate.month + months;
  let newYear = etDate.year;
  
  while (newMonth > 13) {
    newMonth -= 13;
    newYear++;
  }
  while (newMonth < 1) {
    newMonth += 13;
    newYear--;
  }
  
  const newDay = Math.min(etDate.day, getDaysInEthiopianMonth(newYear, newMonth));
  const newEtObj = new Kenat({ year: newYear, month: newMonth, day: newDay });
  const greg = newEtObj.getGregorian();
  return new Date(greg.year, greg.month - 1, greg.day);
}

function hasLatePenalty(dueDate, settings) {
  if (!settings?.lateFeeEnabled) return false;
  const now = getNowInAddisAbaba();
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

// Replicate qr.ts helper functions
function getArrearMonths(leaseStart, payments) {
  const now = new Date();
  const arrears = [];
  
  const coveredMonthKeys = new Set();
  const approvedPayments = payments.filter(p => p.status === "APPROVED");
  
  for (const p of approvedPayments) {
    const startEt = toEthiopian(new Date(p.dueDate));
    const endEt = toEthiopian(p.advanceUntil ? new Date(p.advanceUntil) : new Date(p.dueDate));
    
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

  console.log("[DEBUG] coveredMonthKeys in getArrearMonths:", Array.from(coveredMonthKeys));
  console.log("[DEBUG] startEt:", startEt);
  console.log("[DEBUG] nowEt:", nowEt);

  let tempYear = startEt.year;
  let tempMonth = startEt.month;
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

function calcMonthPenalty(dueDate, rentAmount, settings, dbPenalty) {
  const diffDays = getDaysPastEthiopianExpiry(dueDate);
  
  if (dbPenalty) {
    const penaltyAmount = Math.max(0, dbPenalty.amount - dbPenalty.paidAmount);
    return {
      penalty: penaltyAmount,
      penaltyTier: dbPenalty.paidAmount >= dbPenalty.amount ? 0 : 1,
      diffDays
    };
  }
  
  const hasPenalty = hasLatePenalty(dueDate, settings);
  if (!hasPenalty) return { penalty: 0, penaltyTier: 0, diffDays };
  
  const penaltyAmount = rentAmount * ((settings.lateFeePercentage || 5) / 100);
  return { penalty: penaltyAmount, penaltyTier: 1, diffDays };
}

// Replicate main status function
async function getPublicUnitStatus(slug) {
  try {
    const unit = await prisma.unit.findUnique({
      where: { qrSlug: slug },
      include: {
        property: true,
        leases: {
          orderBy: { createdAt: "desc" },
          include: {
            tenant: { select: { name: true } },
            payments: { orderBy: { dueDate: "asc" } },
            penalties: { orderBy: { dueDate: "asc" } }
          }
        }
      }
    });

    if (!unit) return { success: false, error: "Unit not found." };

    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    const activeLease = unit.leases.find(l => l.status === "ACTIVE" || l.status === "PENDING");
    
    console.log("[DEBUG] activeLease status:", activeLease ? activeLease.status : "null");
    
    const payments = activeLease?.payments || [];
    console.log("[DEBUG] payments length:", payments.length);
    
    const penalties = activeLease?.penalties || [];

    const latestApprovedPayment = [...payments].reverse().find(p => p.status === "APPROVED");
    console.log("[DEBUG] latestApprovedPayment:", latestApprovedPayment);

    const pendingPayments = payments
      .filter(p => p.status === "PENDING" || p.status === "REJECTED")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const pendingDueDates = new Set(
      pendingPayments.map(p => {
        const d = new Date(p.dueDate);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })
    );

    const gapMonthDates = activeLease?.startDate 
      ? getArrearMonths(new Date(activeLease.startDate), payments) 
      : [];
    
    console.log("[DEBUG] gapMonthDates length:", gapMonthDates.length);
    console.log("[DEBUG] gapMonthDates:", gapMonthDates);

    const dbPenaltyMap = new Map();
    for (const p of penalties) {
      const d = new Date(p.dueDate);
      dbPenaltyMap.set(`${d.getFullYear()}-${d.getMonth()}`, p);
    }

    const rawArrearsMonths = [
      ...pendingPayments.map(p => {
        const d = new Date(p.dueDate);
        const dbPenalty = dbPenaltyMap.get(`${d.getFullYear()}-${d.getMonth()}`);
        const { penalty, penaltyTier, diffDays } = calcMonthPenalty(new Date(p.dueDate), unit.rentAmount, settings, dbPenalty);
        return {
          id: p.id,
          dueDate: p.dueDate,
          ethiopianDueDate: getEthiopianMonthEnd(new Date(p.dueDate)),
          daysFromDue: diffDays,
          baseAmount: unit.rentAmount,
          penalty,
          penaltyTier,
          totalAmount: unit.rentAmount + penalty,
          status: p.status,
          receiptUrl: p.receiptUrl || null,
          isGap: false,
          advanceDeduction: 0,
        };
      }),
      ...gapMonthDates.filter(gd => !pendingDueDates.has(`${gd.getFullYear()}-${gd.getMonth()}`)).map(gd => {
        const dbPenalty = dbPenaltyMap.get(`${gd.getFullYear()}-${gd.getMonth()}`);
        const { penalty, penaltyTier, diffDays } = calcMonthPenalty(gd, unit.rentAmount, settings, dbPenalty);
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
          advanceDeduction: 0,
        };
      })
    ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    let remainingAdvance = activeLease?.advanceBalance || 0;
    const arrearsMonths = rawArrearsMonths.map(m => {
      const deduction = Math.min(m.totalAmount, remainingAdvance);
      const updatedTotalAmount = m.totalAmount - deduction;
      remainingAdvance -= deduction;
      return {
        ...m,
        advanceDeduction: deduction,
        totalAmount: updatedTotalAmount
      };
    });

    const arrearsMonthKeys = new Set(
      arrearsMonths.map(m => {
        const d = new Date(m.dueDate);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })
    );

    const unpaidPenalties = penalties
      .filter(p => p.amount - p.paidAmount > 0)
      .filter(p => {
        const d = new Date(p.dueDate);
        return !arrearsMonthKeys.has(`${d.getFullYear()}-${d.getMonth()}`);
      })
      .map(p => ({
        id: p.id,
        amount: p.amount - p.paidAmount,
        dueDate: p.dueDate,
      }));
    const unpaidPenaltyTotal = unpaidPenalties.reduce((sum, p) => sum + p.amount, 0);
    const grandTotal = arrearsMonths.reduce((sum, m) => sum + m.totalAmount, 0) + unpaidPenaltyTotal;

    const primaryMonth = arrearsMonths[0] || null;
    const estimatedNext = !primaryMonth && latestApprovedPayment ? (() => {
      const nextDate = addEthiopianMonths(new Date(latestApprovedPayment.advanceUntil || latestApprovedPayment.dueDate), 1);
      const dbPenalty = dbPenaltyMap.get(`${nextDate.getFullYear()}-${nextDate.getMonth()}`);
      const { penalty, penaltyTier, diffDays } = calcMonthPenalty(nextDate, unit.rentAmount, settings, dbPenalty);
      return {
        id: "estimated",
        dueDate: nextDate,
        ethiopianDueDate: getEthiopianMonthEnd(nextDate),
        daysFromDue: diffDays,
        baseAmount: unit.rentAmount,
        penalty,
        penaltyTier,
        totalAmount: unit.rentAmount + penalty,
        status: "ESTIMATED",
        isGap: false,
        advanceDeduction: 0,
      };
    })() : null;

    const nextDuePayment = primaryMonth || estimatedNext;

    return {
      success: true,
      arrearsCount: arrearsMonths.length,
      arrearsMonths,
      grandTotal,
      nextDuePayment
    };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const result = await getPublicUnitStatus("4MYLJZQF9A");
  console.log("\n--- REAL CALCULATION RESULT FOR B01 ---");
  console.log(JSON.stringify(result, null, 2));
}

main();
