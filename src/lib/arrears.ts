import { getDaysPastEthiopianExpiry, toEthiopian, hasLatePenalty, getDaysInEthiopianMonth } from "./calendar";
import Kenat from "kenat";

/** Calculates penalty amount and tier for a given due date based on Ethiopian calendar, checking against existing database record if provided. */
export function calcMonthPenalty(
  dueDate: Date, 
  rentAmount: number, 
  settings: any, 
  dbPenalty?: any, 
  penaltyExempt: boolean = false,
  property?: any
) {
  const diffDays = getDaysPastEthiopianExpiry(dueDate);
  
  if (penaltyExempt) {
    return { penalty: 0, penaltyTier: 0, diffDays };
  }
  
  if (dbPenalty) {
    if (dbPenalty.status === "WAIVED") {
      return { penalty: 0, penaltyTier: 0, diffDays };
    }
    const penaltyAmount = Math.max(0, dbPenalty.amount - dbPenalty.paidAmount);
    return {
      penalty: penaltyAmount,
      penaltyTier: dbPenalty.paidAmount >= dbPenalty.amount ? 0 : 1,
      diffDays
    };
  }

  // Resolve properties late fee configurations
  let enabled = settings?.lateFeeEnabled;
  let graceDays = 5;
  let percentage = settings?.lateFeePercentage || 5.0;
  let incrementalRulesStr = null;

  if (property) {
    if (property.lateFeeEnabled !== undefined && property.lateFeeEnabled !== null) {
      enabled = property.lateFeeEnabled;
    }
    if (property.lateFeeGraceDays !== undefined && property.lateFeeGraceDays !== null) {
      graceDays = property.lateFeeGraceDays;
    }
    if (property.lateFeePercentage !== undefined && property.lateFeePercentage !== null) {
      percentage = property.lateFeePercentage;
    }
    if (property.incrementalRules) {
      incrementalRulesStr = property.incrementalRules;
    }
  }

  if (!enabled) return { penalty: 0, penaltyTier: 0, diffDays };

  // Penalty starts after graceDays. Standard system starts on Day 6 (when graceDays is 5).
  if (diffDays < graceDays + 1) {
    return { penalty: 0, penaltyTier: 0, diffDays };
  }

  let finalPercentage = percentage;

  // Apply property-specific incremental rules or default settings warning fee
  if (incrementalRulesStr) {
    try {
      const rules = JSON.parse(incrementalRulesStr);
      if (Array.isArray(rules)) {
        const sortedRules = [...rules].sort((a, b) => b.days - a.days);
        for (const rule of sortedRules) {
          if (diffDays >= rule.days) {
            finalPercentage = rule.percentage;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Error parsing incremental rules:", e);
    }
  } else if (!property && settings?.warningFeePercentage !== undefined && diffDays >= 36) {
    // If no property override is active, use the default settings warning fee starting day 36 (i.e. Hamle 6 if due Ginbot 30)
    finalPercentage = settings.warningFeePercentage || 10.0;
  }

  const penaltyAmount = rentAmount * (finalPercentage / 100);
  return { penalty: penaltyAmount, penaltyTier: 1, diffDays };
}

/**
 * Returns all months between leaseStart and now that are NOT covered by any approved payment.
 * Uses Ethiopian calendar stepping.
 */
export function getArrearMonths(leaseStart: Date, payments: any[], terminatedAt?: Date | null): Date[] {
  const now = new Date();
  const limitDate = terminatedAt ? new Date(terminatedAt) : now;
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
  const nowEt = toEthiopian(limitDate);

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
  if (lease.status === "LOCKED_OUT") {
    // For locked out leases, the dynamic rent calculations are frozen.
    // The outstanding debt is simply the sum of unpaid FINAL_SETTLEMENT payments and utilities.
    const unpaidFinalPayments = lease.payments
      .filter((p: any) => p.type === "FINAL_SETTLEMENT" && p.status !== "APPROVED");
      
    const totalFinalSettlementAmount = unpaidFinalPayments.reduce((sum: number, p: any) => sum + p.amount, 0);

    let rentUncollected = 0;
    let penaltiesUncollected = 0;
    let utilitiesUncollected = 0;

    if (totalFinalSettlementAmount > 0) {
      // 1. Sum up lockout fees
      const lockoutFees = lease.lockoutFees || [];
      let lockoutUtilities = 0;
      let lockoutPenalties = 0;
      let lockoutRent = 0;

      for (const fee of lockoutFees) {
        if (fee.feeType === "UTILITY") {
          lockoutUtilities += fee.amount;
        } else {
          const isPenalty = fee.note && (fee.note.toLowerCase().includes("penalty") || fee.note.toLowerCase().includes("late"));
          if (isPenalty) {
            lockoutPenalties += fee.amount;
          } else {
            lockoutRent += fee.amount;
          }
        }
      }

      // 2. The base settlement represents the rent arrears and penalties up to the lockout date.
      // Let's compute the rent portion of the base by running the standard calculation up to terminatedAt
      const totalLockoutFeesAmount = lockoutUtilities + lockoutPenalties + lockoutRent;
      const baseSettlementAmount = Math.max(0, totalFinalSettlementAmount - totalLockoutFeesAmount);

      // Standard active calculation up to terminatedAt to find the rent portion of the base
      const tempLease = {
        ...lease,
        status: "ACTIVE",
        payments: lease.payments.filter((p: any) => p.type !== "FINAL_SETTLEMENT")
      };
      
      const activeBalance = getLeaseUncollectedBalance(tempLease, settings, lease.terminatedAt || endDate);

      // Adjust active rent to exclude manual rent lockout fees to avoid double counting
      const adjustedRentUncollected = Math.max(0, activeBalance.rentUncollected - lockoutRent);
      const rentBase = Math.min(baseSettlementAmount, adjustedRentUncollected);
      const penaltiesBase = baseSettlementAmount - rentBase;

      rentUncollected = rentBase + lockoutRent;
      penaltiesUncollected = penaltiesBase + lockoutPenalties;
      utilitiesUncollected = lockoutUtilities;
    }

    // Include other unpaid utility bills in the UtilityBill table
    const unpaidUtilitiesTable = lease.utilityBills
      ? lease.utilityBills.filter((b: any) => b.status !== "PAID" && (!endDate || new Date(b.createdAt) <= endDate))
      : [];
    const tableUtilitiesAmount = unpaidUtilitiesTable.reduce((sum: number, b: any) => sum + b.amount, 0);
    utilitiesUncollected += tableUtilitiesAmount;

    return {
      rentUncollected,
      penaltiesUncollected,
      utilitiesUncollected,
      totalUncollected: rentUncollected + penaltiesUncollected + utilitiesUncollected
    };
  }

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

  // Unrecorded gap months (capped by lease.terminatedAt)
  const gapMonthDates = getArrearMonths(new Date(lease.startDate), lease.payments, lease.terminatedAt)
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
      const { penalty } = calcMonthPenalty(new Date(p.dueDate), lease.unit.rentAmount, settings, dbPenalty, lease.unit.penaltyExempt, lease.unit.property);
      return {
        dueDate: p.dueDate,
        baseAmount: lease.unit.rentAmount,
        penalty,
        totalAmount: lease.unit.rentAmount + penalty,
      };
    }),
    ...gapMonthDates.filter(gd => !pendingDueDates.has(`${gd.getFullYear()}-${gd.getMonth()}`)).map(gd => {
      const dbPenalty = dbPenaltyMap.get(`${gd.getFullYear()}-${gd.getMonth()}`);
      const { penalty } = calcMonthPenalty(gd, lease.unit.rentAmount, settings, dbPenalty, lease.unit.penaltyExempt, lease.unit.property);
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
    .filter((p: any) => p.amount - p.paidAmount > 0 && p.status !== "WAIVED")
    .filter((p: any) => {
      const d = new Date(p.dueDate);
      return !arrearsMonthKeys.has(`${d.getFullYear()}-${d.getMonth()}`) && (!endDate || d <= endDate);
    });

  const extraPenalties = unpaidPenaltiesList.reduce((sum: number, p: any) => sum + (p.amount - p.paidAmount), 0);
  penaltiesUncollected += extraPenalties;

  // Utilities uncollected
  const utilitiesUncollected = lease.utilityBills
    .filter((b: any) => b.status !== "PAID" && (!endDate || new Date(b.createdAt) <= endDate))
    .reduce((sum: number, b: any) => sum + b.amount, 0);

  const totalUncollected = rentUncollected + penaltiesUncollected + utilitiesUncollected;

  return {
    rentUncollected,
    penaltiesUncollected,
    utilitiesUncollected,
    totalUncollected
  };
}
