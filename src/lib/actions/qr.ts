"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDaysFromEthiopianDue, getEthiopianMonthEnd } from "@/lib/calendar";

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

/** Calculates penalty amount and tier for a given due date based on Ethiopian calendar. */
function calcMonthPenalty(dueDate: Date, rentAmount: number, settings: any) {
  const diffDays = getDaysFromEthiopianDue(dueDate);
  if (!settings?.lateFeeEnabled || diffDays <= 5) return { penalty: 0, penaltyTier: 0, diffDays };
  if (diffDays > 35) return { penalty: rentAmount * ((settings.warningFeePercentage || 10) / 100), penaltyTier: 2, diffDays };
  return { penalty: rentAmount * ((settings.lateFeePercentage || 5) / 100), penaltyTier: 1, diffDays };
}

/**
 * Returns all Ethiopian months that have passed since a base date up to (but not including)
 * months that haven't reached their Ethiopian month-end yet.
 * Each entry is a Gregorian Date representing the START of that billing period.
 */
function getGapMonths(fromApprovedDate: Date): Date[] {
  const now = new Date();
  const gaps: Date[] = [];

  // Start from the month AFTER the last approved payment
  let cursor = new Date(fromApprovedDate);
  cursor.setMonth(cursor.getMonth() + 1);

  // Walk forward month by month
  while (true) {
    const monthEnd = getEthiopianMonthEnd(cursor);
    // Only include months where the Ethiopian month-end has already passed (even if within grace)
    if (monthEnd > now) break;
    gaps.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return gaps;
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
            penalties: { where: { status: "UNPAID" }, orderBy: { dueDate: "asc" } }
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

    // ── STEP 1: Explicit PENDING/REJECTED records ───────────────────────────
    const pendingPayments = payments
      .filter(p => p.status === "PENDING" || p.status === "REJECTED")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // ── STEP 2: Calculate gap months (months with no payment record at all) ──
    // These are months that have fully elapsed since the last approval
    // but the tenant never even submitted a payment for them.
    const pendingDueDates = new Set(
      pendingPayments.map(p => {
        // Normalize to year-month string for comparison
        const d = new Date(p.dueDate);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })
    );

    const gapMonthDates = latestApprovedPayment
      ? getGapMonths(new Date(latestApprovedPayment.dueDate))
      : [];

    // Filter out gap months that already have a PENDING record
    const trueGapMonths = gapMonthDates.filter(gd => {
      const key = `${gd.getFullYear()}-${gd.getMonth()}`;
      return !pendingDueDates.has(key);
    });

    // ── STEP 3: Build unified arrears list ──────────────────────────────────
    // Part A: explicit PENDING/REJECTED payments
    const pendingEntries = pendingPayments.map(p => {
      const { penalty, penaltyTier, diffDays } = calcMonthPenalty(new Date(p.dueDate), unit.rentAmount, settings);
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
      };
    });

    // Part B: gap months (no payment record exists)
    const gapEntries = trueGapMonths.map(gd => {
      const { penalty, penaltyTier, diffDays } = calcMonthPenalty(gd, unit.rentAmount, settings);
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
        isGap: true, // No DB record — system derived
      };
    });

    // Merge and sort oldest first
    const arrearsMonths = [...pendingEntries, ...gapEntries].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    // ── STEP 4: Historical unpaid penalty records ────────────────────────────
    const unpaidPenalties = penalties
      .filter(p => p.amount - p.paidAmount > 0)
      .map(p => ({
        id: p.id,
        amount: p.amount - p.paidAmount,
        dueDate: p.dueDate,
        tier: (p.amount / unit.rentAmount) > 0.06 ? 2 : 1
      }));
    const unpaidPenaltyTotal = unpaidPenalties.reduce((sum, p) => sum + p.amount, 0);

    // ── STEP 5: Grand total ──────────────────────────────────────────────────
    const grandTotal = arrearsMonths.reduce((sum, m) => sum + m.totalAmount, 0) + unpaidPenaltyTotal;

    // ── STEP 6: "Active" month for the countdown (oldest overdue or estimated next) ──
    const primaryMonth = arrearsMonths[0] || null;

    // Estimated next payment only shown when fully up-to-date (no arrears)
    const estimatedNext = !primaryMonth && latestApprovedPayment ? (() => {
      const nextDate = new Date(latestApprovedPayment.type === "ADVANCE" && latestApprovedPayment.advanceUntil
        ? latestApprovedPayment.advanceUntil
        : latestApprovedPayment.dueDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      const { penalty, penaltyTier, diffDays } = calcMonthPenalty(nextDate, unit.rentAmount, settings);
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
        receiptUrl: null,
        isGap: false,
      };
    })() : null;

    const nextDuePayment = primaryMonth || estimatedNext;
    const diffDays = nextDuePayment?.daysFromDue ?? 0;

    return {
      success: true,
      unit: {
        id: unit.id,
        unitNumber: unit.unitNumber,
        property: unit.property.name,
        size: unit.size,
        type: unit.type,
        rentAmount: unit.rentAmount,
        status: unit.status
      },
      lease: activeLease ? {
        id: activeLease.id,
        status: activeLease.status,
        tenantName: activeLease.tenant.name,
        endDate: activeLease.endDate,
        latestApprovedPayment: latestApprovedPayment ? {
          id: latestApprovedPayment.id,
          amount: latestApprovedPayment.amount,
          dueDate: latestApprovedPayment.dueDate,
          type: latestApprovedPayment.type,
          advanceUntil: latestApprovedPayment.advanceUntil,
          status: latestApprovedPayment.status,
          paidAt: latestApprovedPayment.paidAt
        } : null,
        // Full arrears picture
        arrearsMonths,
        arrearsCount: arrearsMonths.length,
        grandTotal,
        unpaidPenalties,
        unpaidPenaltyTotal,
        // Single "active" payment for countdown
        nextDuePayment: nextDuePayment ? {
          ...nextDuePayment,
          unpaidPenaltyTotal,
          historicalPenalties: unpaidPenalties,
          // displayTotal: full grandTotal when multiple months, or single month total
          displayTotal: arrearsMonths.length > 1 ? grandTotal : (nextDuePayment.totalAmount + unpaidPenaltyTotal),
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
