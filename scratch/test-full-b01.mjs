import pg from "pg";
const { Pool } = pg;
import Kenat from "kenat";

const toEthiopian = (date) => {
  const addisDate = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
  return new Kenat(addisDate).getEthiopian();
};

function isEthiopianLeapYear(year) {
  return (year + 1) % 4 === 0;
}

function getDaysInEthiopianMonth(year, month) {
  if (month === 13) {
    return isEthiopianLeapYear(year) ? 6 : 5;
  }
  return 30;
}

const getEthiopianMonthEnd = (date) => {
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
};

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
      
      // Robust boundary check: if we've reached or exceeded endEt, break!
      if (tempYear > endEt.year || (tempYear === endEt.year && tempMonth >= endEt.month)) {
        break;
      }
      
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
  if (dbPenalty) {
    return {
      penalty: dbPenalty.amount,
      penaltyTier: dbPenalty.amount > rentAmount * 0.05 ? "10%" : "5%",
      diffDays: Math.ceil((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24))
    };
  }
  return { penalty: 0, penaltyTier: "0%", diffDays: 0 };
}

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  const pool = new Pool({ connectionString });
  try {
    const leaseId = 'cmpm9bk9b003n2fnyz5ijyio2';
    
    const leaseRes = await pool.query('SELECT * FROM "Lease" WHERE id = $1;', [leaseId]);
    const lease = leaseRes.rows[0];

    const unitRes = await pool.query('SELECT * FROM "Unit" WHERE id = $1;', [lease.unitId]);
    const unit = unitRes.rows[0];
    
    const paymentsRes = await pool.query('SELECT * FROM "Payment" WHERE "leaseId" = $1 ORDER BY "dueDate" ASC;', [leaseId]);
    const payments = paymentsRes.rows;

    const penaltiesRes = await pool.query('SELECT * FROM "Penalty" WHERE "leaseId" = $1 ORDER BY "dueDate" ASC;', [leaseId]);
    const penalties = penaltiesRes.rows;

    const latestApprovedPayment = [...payments].reverse().find(p => p.status === "APPROVED");
    console.log("latestApprovedPayment:", latestApprovedPayment);

    const pendingPayments = payments
      .filter(p => p.status === "PENDING" || p.status === "REJECTED")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const pendingDueDates = new Set(
      pendingPayments.map(p => {
        const d = new Date(p.dueDate);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })
    );

    const gapMonthDates = lease?.startDate 
      ? getArrearMonths(new Date(lease.startDate), payments) 
      : [];
    
    console.log("gapMonthDates:", gapMonthDates);

    const dbPenaltyMap = new Map();
    for (const p of penalties) {
      const d = new Date(p.dueDate);
      dbPenaltyMap.set(`${d.getFullYear()}-${d.getMonth()}`, p);
    }

    const rawArrearsMonths = [
      ...pendingPayments.map(p => {
        const d = new Date(p.dueDate);
        const dbPenalty = dbPenaltyMap.get(`${d.getFullYear()}-${d.getMonth()}`);
        const { penalty, penaltyTier, diffDays } = calcMonthPenalty(new Date(p.dueDate), unit.rentAmount, {}, dbPenalty);
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
        const { penalty, penaltyTier, diffDays } = calcMonthPenalty(gd, unit.rentAmount, {}, dbPenalty);
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

    console.log("rawArrearsMonths count:", rawArrearsMonths.length);
    console.log("rawArrearsMonths details:", rawArrearsMonths);

    let remainingAdvance = lease.advanceBalance || 0;
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

    console.log("arrearsMonths after advance deduction:", arrearsMonths);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
