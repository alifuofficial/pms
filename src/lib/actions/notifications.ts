"use server";

import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/sms";
import { revalidatePath } from "next/cache";
import { getDaysIntoEthiopianMonth, getDaysPastEthiopianExpiry, getDaysUntilEthiopianExpiry, getNowInAddisAbaba, toEthiopian, getEthiopianMonths, addEthiopianMonths } from "@/lib/calendar";
import { runDailyQrBackup } from "@/lib/actions/import-export";
import { getArrearMonths, calcMonthPenalty } from "@/lib/arrears";

export async function processLateFees() {
  try {
    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    if (!settings?.lateFeeEnabled) return { success: true, message: "Late fees are disabled." };

    const activeLeases = await prisma.lease.findMany({
      where: { status: "ACTIVE" },
      include: {
        tenant: {
          select: { id: true, name: true, phoneNumber: true }
        },
        unit: {
          include: { property: true }
        },
        payments: true,
        penalties: true
      }
    });

    let processedCount = 0;

    for (const lease of activeLeases) {
      if (lease.unit.penaltyExempt) {
        continue;
      }

      const leasePayments = lease.payments || [];
      const leasePenalties = lease.penalties || [];

      // Unpaid pending payments
      const leasePendingPayments = leasePayments.filter(
        p => p.status === "PENDING" || p.status === "REJECTED"
      );
      const pendingDueDates = new Set(
        leasePendingPayments.map(p => {
          const d = new Date(p.dueDate);
          return `${d.getFullYear()}-${d.getMonth()}`;
        })
      );

      // Unpaid gap months
      const leaseGapDates = getArrearMonths(new Date(lease.startDate), leasePayments, lease.terminatedAt);

      // Combine unpaid months
      const unpaidItems: Array<{ dueDate: Date; isPending: boolean; paymentId?: string }> = [
        ...leasePendingPayments.map(p => ({ dueDate: p.dueDate, isPending: true, paymentId: p.id })),
        ...leaseGapDates
          .filter(gd => !pendingDueDates.has(`${gd.getFullYear()}-${gd.getMonth()}`))
          .map(gd => ({ dueDate: gd, isPending: false }))
      ];

      for (const item of unpaidItems) {
        const d = item.dueDate;
        const diffDays = getDaysPastEthiopianExpiry(d);

        // Resolve grace days
        let graceDays = 5;
        const prop = lease.unit.property;
        if (prop && prop.lateFeeGraceDays !== undefined && prop.lateFeeGraceDays !== null) {
          graceDays = prop.lateFeeGraceDays;
        }

        // Penalty starts after graceDays. Standard system starts on Day 6 (when graceDays is 5).
        if (diffDays < graceDays + 1) {
          continue;
        }

        // Find existing penalty in-memory for this month/due-date
        const existingPenalty = leasePenalties.find(
          p => p.dueDate.getFullYear() === d.getFullYear() && p.dueDate.getMonth() === d.getMonth()
        ) || null;

        const currentPenaltyAmount = existingPenalty?.amount || 0;

        const penaltyResult = calcMonthPenalty(
          d,
          lease.unit.rentAmount,
          settings,
          existingPenalty,
          lease.unit.penaltyExempt,
          lease.unit.property
        );
        let newPenaltyAmount = penaltyResult.penalty;

        // Decide which template to use (late-fee-1 for base, late-fee-2 for highest warning tier)
        let templateSlug = "";
        if (newPenaltyAmount > 0) {
          let isWarningTier = false;
          if (prop && prop.lateFeeEnabled && prop.incrementalRules) {
            try {
              const rules = JSON.parse(prop.incrementalRules);
              if (Array.isArray(rules) && rules.length > 0) {
                const maxDays = Math.max(...rules.map((r: any) => r.days));
                if (penaltyResult.diffDays >= maxDays) {
                  isWarningTier = true;
                }
              }
            } catch (e) {
              console.error("Error parsing incremental rules:", e);
            }
          } else {
            // Default global settings warning tier (equivalent to diffDays >= 36)
            if (penaltyResult.diffDays >= 36) {
              isWarningTier = true;
            }
          }

          if (isWarningTier) {
            if (currentPenaltyAmount < newPenaltyAmount) {
              templateSlug = "late-fee-2";
            } else {
              // Already at warning tier, keep the penalty amount as is
              newPenaltyAmount = currentPenaltyAmount;
            }
          } else {
            if (currentPenaltyAmount === 0) {
              templateSlug = "late-fee-1";
            } else {
              // Already at base tier, keep the penalty amount as is
              newPenaltyAmount = currentPenaltyAmount;
            }
          }
        }

        if (templateSlug) {
          // Deterministic ID for this penalty
          const penaltyId = item.isPending 
            ? `penalty-${item.paymentId}` 
            : `penalty-gap-${lease.id}-${d.getFullYear()}-${d.getMonth()}`;

          // Save to database
          await prisma.penalty.upsert({
            where: { id: penaltyId },
            create: {
              id: penaltyId,
              leaseId: lease.id,
              tenantId: lease.tenantId,
              amount: newPenaltyAmount,
              dueDate: d,
              status: "UNPAID"
            },
            update: {
              amount: newPenaltyAmount
            }
          });

          if (lease.tenant.phoneNumber) {
            const totalAmount = lease.unit.rentAmount + newPenaltyAmount;

            await sendSMS(lease.tenant.phoneNumber, templateSlug, {
              tenant_name: lease.tenant.name || "Tenant",
              property_name: lease.unit.property.name || "Property",
              unit_number: lease.unit.unitNumber || "N/A",
              amount: totalAmount.toLocaleString(),
              due_date: d.toLocaleDateString()
            });
          }

          processedCount++;
        }
      }
    }

    if (processedCount > 0) {
      revalidatePath("/", "layout");
    }

    return { success: true, processedCount };
  } catch (error) {
    console.error("Process Late Fees Error:", error);
    return { success: false, error: "Failed to process late fees." };
  }
}

function calculateLeaseOutstandingDetails(lease: any, settings: any) {
  const unit = lease.unit;
  const payments = lease.payments || [];
  const penalties = lease.penalties || [];
  
  const pendingPayments = payments
    .filter((p: any) => p.status === "PENDING" || p.status === "REJECTED")
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const pendingDueDates = new Set(
    pendingPayments.map((p: any) => {
      const d = new Date(p.dueDate);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })
  );

  const gapMonthDates = getArrearMonths(new Date(lease.startDate), payments);

  const dbPenaltyMap = new Map<string, any>();
  for (const p of penalties) {
    const d = new Date(p.dueDate);
    dbPenaltyMap.set(`${d.getFullYear()}-${d.getMonth()}`, p);
  }

  const rawArrearsMonths = [
    ...pendingPayments.map((p: any) => {
      const d = new Date(p.dueDate);
      const dbPenalty = dbPenaltyMap.get(`${d.getFullYear()}-${d.getMonth()}`);
      const { penalty } = calcMonthPenalty(new Date(p.dueDate), unit.rentAmount, settings, dbPenalty, unit.penaltyExempt, unit.property);
      return {
        dueDate: p.dueDate,
        totalAmount: unit.rentAmount + penalty,
      };
    }),
    ...gapMonthDates
      .filter((gd: Date) => !pendingDueDates.has(`${gd.getFullYear()}-${gd.getMonth()}`))
      .map((gd: Date) => {
        const dbPenalty = dbPenaltyMap.get(`${gd.getFullYear()}-${gd.getMonth()}`);
        const { penalty } = calcMonthPenalty(gd, unit.rentAmount, settings, dbPenalty, unit.penaltyExempt, unit.property);
        return {
          dueDate: gd,
          totalAmount: unit.rentAmount + penalty,
        };
      }),
  ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Deduct advanceBalance chronologically
  let remainingAdvance = lease.advanceBalance || 0;
  let arrearsCount = 0;
  let arrearsBalance = 0;

  for (const m of rawArrearsMonths) {
    const deduction = Math.min(m.totalAmount, remainingAdvance);
    const updatedTotalAmount = m.totalAmount - deduction;
    remainingAdvance -= deduction;
    if (updatedTotalAmount > 0) {
      arrearsCount++;
      arrearsBalance += updatedTotalAmount;
    }
  }

  const unpaidPenaltyTotal = penalties
    .filter((p: any) => p.status === "UNPAID" || p.status === "PARTIAL")
    .reduce((sum: number, p: any) => sum + (p.amount - p.paidAmount), 0);

  const totalBalance = arrearsBalance + unpaidPenaltyTotal;
  return {
    arrearsBalance,
    unpaidPenaltyTotal,
    totalBalance
  };
}

export async function processDailyAlerts() {
  try {
    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    const activeLeases = await prisma.lease.findMany({
      where: { status: "ACTIVE" },
      include: {
        tenant: { select: { name: true, phoneNumber: true } },
        unit: { include: { property: true } },
        payments: true, // Fetch all payments for arrears calculation
        penalties: true // Fetch all penalties for arrears calculation
      }
    });

    let processedCount = 0;

    for (const lease of activeLeases) {
      if (!lease.tenant.phoneNumber) continue;

      // Filter approved payments for coverage/expiry calculation
      const approvedPayments = lease.payments.filter((p) => p.status === "APPROVED");
      const latestPayment = approvedPayments.length > 0
        ? [...approvedPayments].sort((a, b) => {
            const dateA = new Date(a.advanceUntil || a.dueDate).getTime();
            const dateB = new Date(b.advanceUntil || b.dueDate).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          })[approvedPayments.length - 1]
        : null;
      const coverageUntil = latestPayment?.advanceUntil || latestPayment?.dueDate || lease.startDate;
      const daysLeft = getDaysUntilEthiopianExpiry(new Date(coverageUntil));

      // Calculate total amount they pay (upcoming month's rent + unpaid previous months/fees)
      const { totalBalance } = calculateLeaseOutstandingDetails(lease, settings);
      const upcomingRent = lease.unit.rentAmount;
      const totalToPay = upcomingRent + totalBalance;

      // Resolve the upcoming month name in Ethiopian calendar
      const nextMonthDate = addEthiopianMonths(new Date(coverageUntil), 1);
      const et = toEthiopian(nextMonthDate);
      const months = getEthiopianMonths();
      const monthObj = months.find(m => m.id === et.month);
      const monthNameAm = monthObj?.name.split(" ")[0] || "";
      const monthNameEn = monthObj?.name.split(" ")[1]?.replace(/[()]/g, "") || "";

      const variables = {
        tenant_name: lease.tenant.name || "Tenant",
        unit_number: lease.unit.unitNumber || "N/A",
        month_name: monthNameAm,
        month_name_en: monthNameEn,
        amount: totalToPay.toLocaleString(),
        rent_amount: upcomingRent.toLocaleString(),
        arrears_amount: totalBalance.toLocaleString()
      };

      // Low Remaining Days Alert (e.g. 5 days left)
      if (daysLeft === 5) {
        const slug = lease.unit.penaltyExempt ? "prepaid-expiry-exempt-5" : "prepaid-expiry-5";
        await sendSMS(lease.tenant.phoneNumber, slug, variables, "system");
        processedCount++;
      }
      
      // Grace Period Start Alert (0 days left -> coverage ended today)
      else if (daysLeft === 0) {
        const slug = lease.unit.penaltyExempt ? "prepaid-expiry-exempt-0" : "prepaid-expiry-0";
        await sendSMS(lease.tenant.phoneNumber, slug, variables, "system");
        processedCount++;
      }
    }

    return { success: true, processedCount };
  } catch (error) {
    console.error("Process Daily Alerts Error:", error);
    return { success: false, error: "Failed to process daily alerts." };
  }
}

export async function triggerDailyCronFallback() {
  try {
    const now = getNowInAddisAbaba();
    const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    const settings = await prisma.systemSettings.findUnique({
      where: { id: "global" },
      select: { lastCronRun: true }
    });

    if (!settings) return;

    let lastRunStr = "";
    if (settings.lastCronRun) {
      const lastRunStrAA = new Date(settings.lastCronRun).toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" });
      const lastRunDate = new Date(lastRunStrAA);
      lastRunStr = `${lastRunDate.getFullYear()}-${lastRunDate.getMonth() + 1}-${lastRunDate.getDate()}`;
    }

    if (lastRunStr === todayStr) {
      return;
    }

    // Update lastCronRun first to prevent concurrent execution/loops
    await prisma.systemSettings.update({
      where: { id: "global" },
      data: { lastCronRun: now }
    });

    // Run the tasks asynchronously in the background so we don't block layout render
    (async () => {
      try {
        console.log("[CRON FALLBACK] Starting daily cron jobs...");
        const alertsResult = await processDailyAlerts();
        const lateFeesResult = await processLateFees();
        const backupResult = await runDailyQrBackup();
        console.log("[CRON FALLBACK] Completed daily cron jobs:", {
          alerts: alertsResult.success ? alertsResult.processedCount : 0,
          lateFees: lateFeesResult.success ? lateFeesResult.processedCount : 0,
          backup: backupResult.success
        });
      } catch (err) {
        console.error("[CRON FALLBACK] Error running daily cron jobs:", err);
      }
    })();
  } catch (error) {
    console.error("[CRON FALLBACK] Error in triggerDailyCronFallback:", error);
  }
}

export async function syncAllDailyNotifications() {
  try {
    const alertsResult = await processDailyAlerts();
    const lateFeesResult = await processLateFees();
    return {
      success: true,
      alertsProcessed: alertsResult.success ? alertsResult.processedCount : 0,
      lateFeesProcessed: lateFeesResult.success ? lateFeesResult.processedCount : 0
    };
  } catch (error) {
    console.error("Sync All Daily Notifications Error:", error);
    return { success: false, error: "Failed to run sync." };
  }
}

