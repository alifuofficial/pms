"use server";

import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/sms";
import { revalidatePath } from "next/cache";

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
      const dueDate = new Date(payment.dueDate);
      const diffTime = now.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Ethiopian Legal Context: 
      // Deadline is usually end of month. Grace period is 5 days.
      // Penalty starts on Day 6 (diffDays > 5).
      // Final Warning (10%) starts after next month + 5 days (diffDays > 35).
      
      const existingPenalty = await prisma.penalty.findUnique({ where: { id: `penalty-${payment.id}` } });
      const currentPenaltyAmount = existingPenalty?.amount || 0;

      let templateSlug = "";
      let newPenaltyAmount = currentPenaltyAmount;

      if (diffDays > 35 && (currentPenaltyAmount < payment.lease.unit.rentAmount * 0.10)) {
        templateSlug = "late-fee-2";
        newPenaltyAmount = payment.lease.unit.rentAmount * 0.10; // Final Warning: 10%
      } else if (diffDays > 5 && (currentPenaltyAmount === 0)) {
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
