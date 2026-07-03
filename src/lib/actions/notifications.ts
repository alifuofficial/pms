"use server";

import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/sms";
import { revalidatePath } from "next/cache";
import { getDaysIntoEthiopianMonth, getDaysUntilEthiopianExpiry, getNowInAddisAbaba, toEthiopian, getEthiopianMonths, addEthiopianMonths } from "@/lib/calendar";
import { runDailyQrBackup } from "@/lib/actions/import-export";
import { getArrearMonths, calcMonthPenalty } from "@/lib/arrears";

export async function processLateFees() {
  try {
    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    if (!settings?.lateFeeEnabled) return { success: true, message: "Late fees are disabled." };

    const pendingPayments = await prisma.payment.findMany({
      where: { 
        status: "PENDING"
      },
      include: {
        tenant: {
          select: { name: true, phoneNumber: true }
        },
        lease: {
          include: {
            unit: {
              include: { property: true }
            }
          }
        }
      }
    });

    let processedCount = 0;
    const now = new Date();

    for (const payment of pendingPayments) {
      if (payment.lease.unit.penaltyExempt) {
        continue;
      }

      const diffDays = getDaysIntoEthiopianMonth(new Date(payment.dueDate));

      // Ethiopian Legal Context: 
      // Deadline is usually end of month. Grace period is Day 1 to Day 5.
      // Penalty starts on Day 6 (diffDays >= 5).
      
      const existingPenalty = await prisma.penalty.findUnique({ where: { id: `penalty-${payment.id}` } });
      const currentPenaltyAmount = existingPenalty?.amount || 0;

      let templateSlug = "";
      let newPenaltyAmount = currentPenaltyAmount;

      if (diffDays >= 35 && currentPenaltyAmount < payment.lease.unit.rentAmount * ((settings.warningFeePercentage || 10) / 100)) {
        templateSlug = "late-fee-2";
        newPenaltyAmount = payment.lease.unit.rentAmount * ((settings.warningFeePercentage || 10) / 100);
      } else if (diffDays >= 5 && diffDays < 35 && currentPenaltyAmount === 0) {
        templateSlug = "late-fee-1";
        newPenaltyAmount = payment.lease.unit.rentAmount * ((settings.lateFeePercentage || 5) / 100);
      }

      if (templateSlug && payment.tenant.phoneNumber) {
        const totalAmount = payment.amount + newPenaltyAmount;

        await sendSMS(payment.tenant.phoneNumber, templateSlug, {
          tenant_name: payment.tenant.name || "Tenant",
          property_name: payment.lease.unit.property.name || "Property",
          unit_number: payment.lease.unit.unitNumber || "N/A",
          amount: totalAmount.toLocaleString(),
          due_date: payment.dueDate.toLocaleDateString()
        });

        // Save to Penalty table
        await prisma.penalty.upsert({
          where: { id: `penalty-${payment.id}` }, // Deterministic ID for this payment's penalty
          create: {
            id: `penalty-${payment.id}`,
            leaseId: payment.leaseId,
            tenantId: payment.tenantId,
            amount: newPenaltyAmount,
            dueDate: payment.dueDate,
            status: "UNPAID"
          },
          update: {
            amount: newPenaltyAmount
          }
        });
        
        processedCount++;
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
      const { penalty } = calcMonthPenalty(new Date(p.dueDate), unit.rentAmount, settings, dbPenalty, unit.penaltyExempt);
      return {
        dueDate: p.dueDate,
        totalAmount: unit.rentAmount + penalty,
      };
    }),
    ...gapMonthDates
      .filter((gd: Date) => !pendingDueDates.has(`${gd.getFullYear()}-${gd.getMonth()}`))
      .map((gd: Date) => {
        const dbPenalty = dbPenaltyMap.get(`${gd.getFullYear()}-${gd.getMonth()}`);
        const { penalty } = calcMonthPenalty(gd, unit.rentAmount, settings, dbPenalty, unit.penaltyExempt);
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
        month_name: monthNameAm,
        month_name_en: monthNameEn,
        amount: totalToPay.toLocaleString(),
        rent_amount: upcomingRent.toLocaleString(),
        arrears_amount: totalBalance.toLocaleString()
      };

      // Low Remaining Days Alert (e.g. 5 days left)
      if (daysLeft === 5) {
        await sendSMS(lease.tenant.phoneNumber, "prepaid-expiry-5", variables, "system");
        processedCount++;
      }
      
      // Grace Period Start Alert (0 days left -> coverage ended today)
      else if (daysLeft === 0) {
        await sendSMS(lease.tenant.phoneNumber, "prepaid-expiry-0", variables, "system");
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

