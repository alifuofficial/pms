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
        status: "PENDING",
        lateFeeApplied: { lt: 2 } // Only those that haven't reached tier 2
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

      let appliedTier = payment.lateFeeApplied;
      let templateSlug = "";

      if (diffDays > 12 && appliedTier < 2) {
        templateSlug = "late-fee-2";
        appliedTier = 2;
      } else if (diffDays > 5 && appliedTier < 1) {
        templateSlug = "late-fee-1";
        appliedTier = 1;
      }

      if (templateSlug && payment.tenant.phoneNumber) {
        // Calculate amount including penalty for the SMS
        const penaltyRate = appliedTier === 2 ? 0.10 : (settings.lateFeePercentage / 100);
        const totalAmount = payment.amount + (payment.lease.unit.rentAmount * penaltyRate);

        await sendSMS(payment.tenant.phoneNumber, templateSlug, {
          tenant_name: payment.tenant.name || "Tenant",
          property_name: payment.lease.unit.property.name || "Property",
          unit_number: payment.lease.unit.unitNumber || "N/A",
          amount: totalAmount.toLocaleString(),
          due_date: payment.dueDate.toLocaleDateString()
        });

        await prisma.payment.update({
          where: { id: payment.id },
          data: { lateFeeApplied: appliedTier }
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
