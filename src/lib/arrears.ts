import { getDaysPastEthiopianExpiry, toEthiopian, hasLatePenalty, getDaysInEthiopianMonth } from "./calendar";
import Kenat from "kenat";

/** Calculates penalty amount and tier for a given due date based on Ethiopian calendar, checking against existing database record if provided. */
export function calcMonthPenalty(dueDate: Date, rentAmount: number, settings: any, dbPenalty?: any, penaltyExempt: boolean = false) {
  const diffDays = getDaysPastEthiopianExpiry(dueDate);
  
  if (penaltyExempt) {
    return { penalty: 0, penaltyTier: 0, diffDays };
  }
  
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
  
  // Rule: Flat 5% penalty fee. Non-compounding.
  const penaltyAmount = rentAmount * ((settings.lateFeePercentage || 5) / 100);
  return { penalty: penaltyAmount, penaltyTier: 1, diffDays };
}

/**
 * Returns all months between leaseStart and now that are NOT covered by any approved payment.
 * Uses Ethiopian calendar stepping.
 */
export function getArrearMonths(leaseStart: Date, payments: any[]): Date[] {
  const now = new Date();
  const arrears: Date[] = [];
  
  const coveredMonthKeys = new Set<string>();
  const approvedPayments = payments.filter(p => p.status === "APPROVED");
  
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

  let tempYear = startEt.year;
  let tempMonth = startEt.month;
  
  // Skip the starting month if the lease starts on the last day of the Ethiopian month
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
      const greg = etDateObj.getGregorian() as any;
      // Force UTC to avoid local timezone drift parsing back
      arrears.push(new Date(Date.UTC(greg.year, greg.month - 1, greg.day, 12, 0, 0)));
    }
    
    if (tempYear === nowEt.year && tempMonth === nowEt.month) break;
    tempMonth++;
    if (tempMonth > 13) { tempMonth = 1; tempYear++; }
    iterations++;
  }

  return arrears;
}

export function getLeaseUncollectedBalance(lease: any, settings: any, endDate?: Date) {
  // Rent payments not approved (PENDING, REJECTED)
  const pendingPayments = lease.payments
    .filter((p: any) => p.status === "PENDING" || p.status === "REJECTED")
    .filter((p: any) => !endDate || new Date(p.dueDate) <= endDate);

  const pendingDueDates = new Set(
    pendingPayments.map((p: any) => {
      const d = new Date(p.dueDate);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })
  );

  // Unrecorded gap months
  const gapMonthDates = getArrearMonths(new Date(lease.startDate), lease.payments)
    .filter(gd => !endDate || gd <= endDate);

  const dbPenaltyMap = new Map<string, any>();
  for (const p of lease.penalties) {
    const d = new Date(p.dueDate);
    dbPenaltyMap.set(`${d.getFullYear()}-${d.getMonth()}`, p);
  }

  const rawArrearsMonths = [
    ...pendingPayments.map((p: any) => {
      const d = new Date(p.dueDate);
      const dbPenalty = dbPenaltyMap.get(`${d.getFullYear()}-${d.getMonth()}`);
      const { penalty } = calcMonthPenalty(new Date(p.dueDate), lease.unit.rentAmount, settings, dbPenalty, lease.unit.penaltyExempt);
      return {
        dueDate: p.dueDate,
        baseAmount: lease.unit.rentAmount,
        penalty,
        totalAmount: lease.unit.rentAmount + penalty,
      };
    }),
    ...gapMonthDates.filter(gd => !pendingDueDates.has(`${gd.getFullYear()}-${gd.getMonth()}`)).map(gd => {
      const dbPenalty = dbPenaltyMap.get(`${gd.getFullYear()}-${gd.getMonth()}`);
      const { penalty } = calcMonthPenalty(gd, lease.unit.rentAmount, settings, dbPenalty, lease.unit.penaltyExempt);
      return {
        dueDate: gd,
        baseAmount: lease.unit.rentAmount,
        penalty,
        totalAmount: lease.unit.rentAmount + penalty,
      };
    })
  ];

  // Deduct advanceBalance chronologically
  let remainingAdvance = lease.advanceBalance || 0;
  let rentUncollected = 0;
  let penaltiesUncollected = 0;

  for (const m of rawArrearsMonths) {
    let baseAmount = m.baseAmount;
    let penalty = m.penalty;

    if (remainingAdvance > 0) {
      const deductBase = Math.min(baseAmount, remainingAdvance);
      baseAmount -= deductBase;
      remainingAdvance -= deductBase;
    }
    if (remainingAdvance > 0) {
      const deductPenalty = Math.min(penalty, remainingAdvance);
      penalty -= deductPenalty;
      remainingAdvance -= deductPenalty;
    }

    rentUncollected += baseAmount;
    penaltiesUncollected += penalty;
  }

  // Add outstanding penalties not in arrears months
  const arrearsMonthKeys = new Set(
    rawArrearsMonths.map(m => {
      const d = new Date(m.dueDate);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })
  );

  const unpaidPenaltiesList = lease.penalties
    .filter((p: any) => p.amount - p.paidAmount > 0)
    .filter((p: any) => {
      const d = new Date(p.dueDate);
      return !arrearsMonthKeys.has(`${d.getFullYear()}-${d.getMonth()}`) && (!endDate || d <= endDate);
    });

  const extraPenalties = unpaidPenaltiesList.reduce((sum: number, p: any) => sum + (p.amount - p.paidAmount), 0);
  penaltiesUncollected += extraPenalties;

  // Utilities uncollected
  const utilitiesUncollected = lease.utilityBills
    .filter((b: any) => b.status !== "PAID" && (!endDate || new Date(b.dueDate) <= endDate))
    .reduce((sum: number, b: any) => sum + b.amount, 0);

  const totalUncollected = rentUncollected + penaltiesUncollected + utilitiesUncollected;

  return {
    rentUncollected,
    penaltiesUncollected,
    utilitiesUncollected,
    totalUncollected
  };
}
