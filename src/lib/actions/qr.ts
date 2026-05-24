"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDaysPastEthiopianExpiry, getDaysUntilEthiopianExpiry, getEthiopianMonthEnd, addEthiopianMonths, toEthiopian, hasLatePenalty } from "@/lib/calendar";
import Kenat from "kenat";

function generateSlug(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function generateUnitQrSlug(unitId: string) {
  try {
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) return { success: false, error: "Unit not found." };
    if (unit.qrSlug) return { success: true, slug: unit.qrSlug };

    let slug = "";
    let attempts = 0;
    while (attempts < 5) {
      slug = generateSlug();
      try {
        await prisma.unit.update({ where: { id: unitId }, data: { qrSlug: slug } });
        break;
      } catch (e: any) {
        if (e.code === "P2002") { attempts++; continue; }
        throw e;
      }
    }

    if (attempts === 5) return { success: false, error: "Failed to generate unique slug." };

    revalidatePath("/admin/units", "page");
    revalidatePath("/(portal)/admin/units", "page");
    return { success: true, slug };
  } catch (error: any) {
    console.error("Generate QR Slug Error:", error);
    return { success: false, error: error.message || "Failed to generate gateway slug." };
  }
}

/** Calculates penalty amount and tier for a given due date based on Ethiopian calendar, checking against existing database record if provided. */
function calcMonthPenalty(dueDate: Date, rentAmount: number, settings: any, dbPenalty?: any) {
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
function getArrearMonths(leaseStart: Date, payments: any[]): Date[] {
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

export async function getPublicUnitStatus(slug: string) {
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
    const bankAccounts = await prisma.bankAccount.findMany({ orderBy: { createdAt: "desc" } });

    const activeLease = unit.leases.find(l => l.status === "ACTIVE") || unit.leases[0];
    const payments = activeLease?.payments || [];
    const penalties = activeLease?.penalties || [];

    const latestApprovedPayment = [...payments].reverse().find(p => p.status === "APPROVED");

    // ── STEP 1: Determine Coverage and Days Left ───────────────────────────
    const coverageDate = latestApprovedPayment
      ? (latestApprovedPayment.advanceUntil || latestApprovedPayment.dueDate)
      : activeLease?.startDate 
        ? new Date(activeLease.startDate)
        : null;

    // Use Ethiopian Month End for the coverage calculation
    const coverageEnd = coverageDate ? getEthiopianMonthEnd(new Date(coverageDate)) : null;
    const now = new Date();
    
    const coverageUntil = latestApprovedPayment?.advanceUntil || latestApprovedPayment?.dueDate || null;
    const daysLeftVal = coverageUntil ? getDaysUntilEthiopianExpiry(new Date(coverageUntil)) : 0;

    // Adjust countdown based on the lease's advanceBalance
    const monthlyRent = unit.rentAmount;
    const advanceBalance = activeLease?.advanceBalance || 0;
    const partialDays = monthlyRent > 0 ? Math.floor((advanceBalance / monthlyRent) * 30) : 0;
    const daysLeft = daysLeftVal + partialDays;

    // ── STEP 2: Calculate Arrears (Gap Months) ─────────────────────────────
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

    const dbPenaltyMap = new Map<string, any>();
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
          status: p.status as string,
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

    // Deduct advanceBalance chronologically from rawArrearsMonths
    let remainingAdvance = advanceBalance;
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

    // ── STEP 3: Penalties and Totals ───────────────────────────────────────
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

    // ── STEP 4: Next Due Payment ───────────────────────────────────────────
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
      unit: {
        id: unit.id,
        unitNumber: unit.unitNumber,
        property: unit.property.name,
        rentAmount: unit.rentAmount,
        status: unit.status,
        type: (unit as any).type || "Studio",
        size: (unit as any).size || unit.rentAmount
      },
      lease: activeLease ? {
        id: activeLease.id,
        status: activeLease.status,
        tenantName: activeLease.tenant.name,
        advanceBalance: (activeLease as any).advanceBalance || 0,
        pendingAmount: payments
          .filter(p => p.status === "PENDING")
          .reduce((sum, p) => sum + p.amount, 0),
        daysLeft,
        arrearsMonths,
        arrearsCount: arrearsMonths.length,
        grandTotal,
        unpaidPenaltyTotal,
        unpaidPenalties,
        nextDuePayment: nextDuePayment ? {
          ...nextDuePayment,
          unpaidPenaltyTotal,
          displayTotal: arrearsMonths.length > 1 ? grandTotal : (nextDuePayment.totalAmount + unpaidPenaltyTotal),
          historicalPenalties: unpaidPenalties,
        } : null,
        latestApprovedPayment: latestApprovedPayment ? {
          id: latestApprovedPayment.id,
          dueDate: latestApprovedPayment.dueDate,
          advanceUntil: latestApprovedPayment.advanceUntil,
        } : null
      } : null,

      settings: {
        currency: settings?.currency || "USD",
        bankAccounts,
        lateFeeEnabled: settings?.lateFeeEnabled
      }
    };
  } catch (error) {
    console.error("Fetch Public Unit Error:", error);
    return { success: false, error: "Failed to load unit status." };
  }
}
