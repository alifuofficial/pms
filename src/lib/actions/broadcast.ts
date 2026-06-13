"use server";

import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/sms";
import { getArrearMonths, calcMonthPenalty } from "@/lib/arrears";

export async function getBroadcastRecipients() {
  try {
    const tenants = await prisma.user.findMany({
      where: { role: "TENANT" },
      include: {
        leases: {
          where: { status: { in: ["ACTIVE", "PENDING"] } },
          include: {
            unit: {
              include: {
                property: true,
              },
            },
            payments: { orderBy: { dueDate: "asc" } },
            penalties: { orderBy: { dueDate: "asc" } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const properties = await prisma.property.findMany({
      orderBy: { name: "asc" },
    });

    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });

    const serializedRecipients: any[] = [];

    for (const tenant of tenants) {
      const activeLeases = tenant.leases.filter((l) => l.status === "ACTIVE" || l.status === "PENDING");

      if (activeLeases.length === 0) {
        serializedRecipients.push({
          id: `${tenant.id}-none`,
          userId: tenant.id,
          leaseId: null,
          name: tenant.name || "Unnamed Tenant",
          email: tenant.email || "",
          phoneNumber: tenant.phoneNumber || "",
          propertyId: "",
          propertyName: "No Active Lease",
          unitNumber: "N/A",
          hasActiveLease: false,
          arrearsCount: 0,
          arrearsBalance: 0,
          unpaidPenaltyTotal: 0,
          totalBalance: 0,
          overdue: false,
        });
        continue;
      }

      for (const lease of activeLeases) {
        const unit = lease.unit;
        const property = unit.property;
        const payments = lease.payments || [];
        const penalties = lease.penalties || [];
        
        const pendingPayments = payments
          .filter((p) => p.status === "PENDING" || p.status === "REJECTED")
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        const pendingDueDates = new Set(
          pendingPayments.map((p) => {
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
          ...pendingPayments.map((p) => {
            const d = new Date(p.dueDate);
            const dbPenalty = dbPenaltyMap.get(`${d.getFullYear()}-${d.getMonth()}`);
            const { penalty } = calcMonthPenalty(new Date(p.dueDate), unit.rentAmount, settings, dbPenalty, unit.penaltyExempt);
            return {
              dueDate: p.dueDate,
              totalAmount: unit.rentAmount + penalty,
            };
          }),
          ...gapMonthDates
            .filter((gd) => !pendingDueDates.has(`${gd.getFullYear()}-${gd.getMonth()}`))
            .map((gd) => {
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
          .filter((p) => p.status === "UNPAID" || p.status === "PARTIAL")
          .reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);

        const totalBalance = arrearsBalance + unpaidPenaltyTotal;

        serializedRecipients.push({
          id: `${tenant.id}-${lease.id}`,
          userId: tenant.id,
          leaseId: lease.id,
          name: tenant.name || "Unnamed Tenant",
          email: tenant.email || "",
          phoneNumber: tenant.phoneNumber || "",
          propertyId: property.id,
          propertyName: property.name,
          unitNumber: unit.unitNumber,
          hasActiveLease: true,
          arrearsCount,
          arrearsBalance,
          unpaidPenaltyTotal,
          totalBalance,
          overdue: arrearsCount > 0 || unpaidPenaltyTotal > 0,
        });
      }
    }

    return {
      success: true,
      tenants: serializedRecipients,
      properties,
    };
  } catch (error: any) {
    console.error("Get Broadcast Recipients Error:", error);
    return {
      success: false,
      error: "Failed to load broadcast recipients: " + (error?.message || "Internal error"),
      tenants: [],
      properties: [],
    };
  }
}

export async function sendBroadcastSMS(recipientIds: string[], messageTemplate: string) {
  try {
    if (!recipientIds || recipientIds.length === 0) {
      return { success: false, error: "No recipients selected." };
    }
    if (!messageTemplate || messageTemplate.trim() === "") {
      return { success: false, error: "Message template cannot be empty." };
    }

    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const recipientId of recipientIds) {
      const [userId, leaseId] = recipientId.split("-");
      if (!userId) {
        skipped++;
        continue;
      }

      const tenant = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!tenant) {
        skipped++;
        continue;
      }

      if (!tenant.phoneNumber || tenant.phoneNumber.trim() === "") {
        // Create a skipped log directly
        await prisma.smsLog.create({
          data: {
            msisdn: "N/A",
            message: `[Broadcast] (To: ${tenant.name || tenant.id}) - Skipped: No phone number configured`,
            status: "SKIPPED",
            source: "broadcast",
            response: "No phone number available on tenant record",
          },
        });
        skipped++;
        continue;
      }

      let activeLease = null;
      if (leaseId && leaseId !== "none") {
        activeLease = await prisma.lease.findUnique({
          where: { id: leaseId },
          include: {
            unit: {
              include: {
                property: true,
              },
            },
            payments: { orderBy: { dueDate: "asc" } },
            penalties: { orderBy: { dueDate: "asc" } },
          },
        });
      }
      
      let unitNumber = "N/A";
      let propertyName = "No Active Lease";
      let arrearsCount = 0;
      let arrearsBalance = 0;
      let unpaidPenaltyTotal = 0;

      if (activeLease) {
        const unit = activeLease.unit;
        unitNumber = unit.unitNumber;
        propertyName = unit.property.name;

        const payments = activeLease.payments || [];
        const penalties = activeLease.penalties || [];
        
        const pendingPayments = payments
          .filter((p) => p.status === "PENDING" || p.status === "REJECTED")
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        const pendingDueDates = new Set(
          pendingPayments.map((p) => {
            const d = new Date(p.dueDate);
            return `${d.getFullYear()}-${d.getMonth()}`;
          })
        );

        const gapMonthDates = getArrearMonths(new Date(activeLease.startDate), payments);

        const dbPenaltyMap = new Map<string, any>();
        for (const p of penalties) {
          const d = new Date(p.dueDate);
          dbPenaltyMap.set(`${d.getFullYear()}-${d.getMonth()}`, p);
        }

        const rawArrearsMonths = [
          ...pendingPayments.map((p) => {
            const d = new Date(p.dueDate);
            const dbPenalty = dbPenaltyMap.get(`${d.getFullYear()}-${d.getMonth()}`);
            const { penalty } = calcMonthPenalty(new Date(p.dueDate), unit.rentAmount, settings, dbPenalty, unit.penaltyExempt);
            return {
              dueDate: p.dueDate,
              totalAmount: unit.rentAmount + penalty,
            };
          }),
          ...gapMonthDates
            .filter((gd) => !pendingDueDates.has(`${gd.getFullYear()}-${gd.getMonth()}`))
            .map((gd) => {
              const dbPenalty = dbPenaltyMap.get(`${gd.getFullYear()}-${gd.getMonth()}`);
              const { penalty } = calcMonthPenalty(gd, unit.rentAmount, settings, dbPenalty, unit.penaltyExempt);
              return {
                dueDate: gd,
                totalAmount: unit.rentAmount + penalty,
              };
            }),
        ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        // Deduct advanceBalance chronologically
        let remainingAdvance = activeLease.advanceBalance || 0;

        for (const m of rawArrearsMonths) {
          const deduction = Math.min(m.totalAmount, remainingAdvance);
          const updatedTotalAmount = m.totalAmount - deduction;
          remainingAdvance -= deduction;
          if (updatedTotalAmount > 0) {
            arrearsCount++;
            arrearsBalance += updatedTotalAmount;
          }
        }

        unpaidPenaltyTotal = penalties
          .filter((p) => p.status === "UNPAID" || p.status === "PARTIAL")
          .reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);
      }

      const totalBalance = arrearsBalance + unpaidPenaltyTotal;

      // Replace placeholders
      let finalMessage = messageTemplate
        .replace(/{{tenantName}}/g, tenant.name || "Tenant")
        .replace(/{{unitNumber}}/g, unitNumber)
        .replace(/{{propertyName}}/g, propertyName)
        .replace(/{{arrearsCount}}/g, arrearsCount.toString())
        .replace(/{{arrearsBalance}}/g, arrearsBalance.toLocaleString())
        .replace(/{{unpaidPenaltyTotal}}/g, unpaidPenaltyTotal.toLocaleString())
        .replace(/{{totalBalance}}/g, totalBalance.toLocaleString());

      // Send SMS
      const res = await sendSMS(tenant.phoneNumber, finalMessage, undefined, "broadcast");
      if (res.success && !res.skipped) {
        sent++;
      } else if (res.skipped) {
        skipped++;
      } else {
        failed++;
      }
    }

    return {
      success: true,
      sent,
      failed,
      skipped,
    };
  } catch (error: any) {
    console.error("Send Broadcast SMS Error:", error);
    return {
      success: false,
      error: "Broadcast execution error: " + (error?.message || "Internal error"),
    };
  }
}
