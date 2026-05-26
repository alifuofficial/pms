import { getDaysPastEthiopianExpiry, toEthiopian, hasLatePenalty } from "./calendar";
import Kenat from "kenat";

/** Calculates penalty amount and tier for a given due date based on Ethiopian calendar, checking against existing database record if provided. */
export function calcMonthPenalty(dueDate: Date, rentAmount: number, settings: any, dbPenalty?: any) {
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
    const startEt = toEthiopian(new Date(p.dueDate));
    const endEt = toEthiopian(p.advanceUntil ? new Date(p.advanceUntil) : new Date(p.dueDate));
    
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
