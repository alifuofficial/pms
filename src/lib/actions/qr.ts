"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDaysPastEthiopianExpiry, getDaysUntilEthiopianExpiry, getEthiopianMonthEnd, addEthiopianMonths, toEthiopian, hasLatePenalty } from "@/lib/calendar";
import Kenat from "kenat";
import { auth } from "@/auth";
import { calcMonthPenalty, getArrearMonths } from "@/lib/arrears";

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

// Core financial calculations are imported from @/lib/arrears

export async function getPublicUnitStatus(slug: string) {
  try {
    let unit = await prisma.unit.findUnique({
      where: { qrSlug: slug },
      include: {
        property: true,
        mergedUnits: true,
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

    // Resolve to root parent unit recursively to support chain merges
    let rootUnitId = unit.id;
    let rootUnitMergedIntoId = unit.mergedIntoId;
    const visited = new Set<string>([unit.id]);
    while (rootUnitMergedIntoId && !visited.has(rootUnitMergedIntoId)) {
      const parent = await prisma.unit.findUnique({
        where: { id: rootUnitMergedIntoId },
        select: { id: true, mergedIntoId: true }
      });
      if (!parent) break;
      rootUnitId = parent.id;
      rootUnitMergedIntoId = parent.mergedIntoId;
      visited.add(parent.id);
    }

    if (rootUnitId !== unit.id) {
      const parentUnit = await prisma.unit.findUnique({
        where: { id: rootUnitId },
        include: {
          property: true,
          mergedUnits: true,
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
      if (parentUnit) {
        unit = parentUnit;
      }
    }

    // Now combine details across all merged units
    if (unit.mergedUnits && unit.mergedUnits.length > 0) {
      const childNumbers = unit.mergedUnits.map(u => u.unitNumber).join(" + ");
      unit.unitNumber = `${unit.unitNumber} + ${childNumbers}`;
      
      const totalSize = (unit.size || 0) + unit.mergedUnits.reduce((acc, curr) => acc + (curr.size || 0), 0);
      unit.size = totalSize;
      
      const totalRent = unit.rentAmount + unit.mergedUnits.reduce((acc, curr) => acc + (curr.rentAmount || 0), 0);
      unit.rentAmount = totalRent;
    }

    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    const bankAccounts = await prisma.bankAccount.findMany({ orderBy: { createdAt: "desc" } });

    const activeLease = unit.leases.find(l => l.status === "ACTIVE" || l.status === "PENDING");
    const payments = activeLease?.payments || [];
    const penalties = activeLease?.penalties || [];
    const utilityBills = activeLease
      ? await prisma.utilityBill.findMany({
          where: { leaseId: activeLease.id },
          orderBy: { readingDate: "desc" }
        })
      : [];

    const approvedPayments = payments.filter(p => p.status === "APPROVED");
    const latestApprovedPayment = approvedPayments.length > 0
      ? [...approvedPayments].sort((a, b) => {
          const dateA = new Date(a.advanceUntil || a.dueDate).getTime();
          const dateB = new Date(b.advanceUntil || b.dueDate).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        })[approvedPayments.length - 1]
      : null;

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
        const { penalty, penaltyTier, diffDays } = calcMonthPenalty(new Date(p.dueDate), unit.rentAmount, settings, dbPenalty, unit.penaltyExempt);
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
        const { penalty, penaltyTier, diffDays } = calcMonthPenalty(gd, unit.rentAmount, settings, dbPenalty, unit.penaltyExempt);
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
      const { penalty, penaltyTier, diffDays } = calcMonthPenalty(nextDate, unit.rentAmount, settings, dbPenalty, unit.penaltyExempt);
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
        arrearsCount: arrearsMonths.filter(m => m.totalAmount > 0).length,
        grandTotal,
        unpaidPenaltyTotal,
        unpaidPenalties,
        utilityBills,
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

export async function backfillMissingQrSlugs() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const units = await prisma.unit.findMany({
      where: {
        OR: [
          { qrSlug: null },
          { qrSlug: "" }
        ]
      }
    });

    let updatedCount = 0;
    for (const unit of units) {
      let slug = "";
      let attempts = 0;
      while (attempts < 10) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let tempSlug = "";
        for (let i = 0; i < 10; i++) {
          tempSlug += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Ensure uniqueness
        const duplicate = await prisma.unit.findUnique({ where: { qrSlug: tempSlug } });
        if (!duplicate) {
          slug = tempSlug;
          break;
        }
        attempts++;
      }

      if (slug) {
        await prisma.unit.update({
          where: { id: unit.id },
          data: { qrSlug: slug }
        });
        updatedCount++;
      }
    }

    revalidatePath("/admin/settings");
    revalidatePath("/admin/units");
    return { success: true, updatedCount };
  } catch (error: any) {
    console.error("Backfill QR Slugs Error:", error);
    return { success: false, error: error.message || "Failed to backfill QR codes." };
  }
}

export async function verifyQrIntegrity() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const units = await prisma.unit.findMany({
      select: {
        id: true,
        unitNumber: true,
        qrSlug: true,
        property: { select: { name: true } }
      }
    });

    const totalUnits = units.length;
    const missingSlugs: any[] = [];
    const duplicates = new Map<string, string[]>();
    const malformedSlugs: any[] = [];
    const validSlugs = new Set<string>();

    const pattern = /^[A-Z2-9]{10}$/; // Our high-entropy standard

    for (const u of units) {
      if (!u.qrSlug) {
        missingSlugs.push({
          unitNumber: u.unitNumber,
          propertyName: u.property.name
        });
        continue;
      }

      // Check duplicates
      if (validSlugs.has(u.qrSlug)) {
        const list = duplicates.get(u.qrSlug) || [];
        if (list.length === 0) {
          // Find the original unit that used this slug
          const original = units.find(item => item.id !== u.id && item.qrSlug === u.qrSlug);
          if (original) list.push(`${original.property.name} - ${original.unitNumber}`);
        }
        list.push(`${u.property.name} - ${u.unitNumber}`);
        duplicates.set(u.qrSlug, list);
      } else {
        validSlugs.add(u.qrSlug);
      }

      // Check malformed or predictable patterns (non 10-char alphanumeric standard)
      if (!pattern.test(u.qrSlug)) {
        malformedSlugs.push({
          unitNumber: u.unitNumber,
          propertyName: u.property.name,
          slug: u.qrSlug
        });
      }
    }

    const duplicatesList: any[] = [];
    duplicates.forEach((unitsList, slug) => {
      duplicatesList.push({ slug, units: unitsList });
    });

    const isHealthy = missingSlugs.length === 0 && duplicatesList.length === 0 && malformedSlugs.length === 0;

    return {
      success: true,
      report: {
        isHealthy,
        totalUnits,
        securedCount: validSlugs.size,
        missingCount: missingSlugs.length,
        missingSlugs,
        duplicateCount: duplicatesList.length,
        duplicatesList,
        malformedCount: malformedSlugs.length,
        malformedSlugs
      }
    };
  } catch (error: any) {
    console.error("Verify QR Integrity Error:", error);
    return { success: false, error: error.message || "Failed to verify integrity." };
  }
}
