"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { uploadFile } from "./storage";

export async function reportPublicPayment(formData: FormData) {
  try {
    const unitId = formData.get("unitId") as string;
    const senderName = formData.get("senderName") as string;
    const transactionId = formData.get("transactionId") as string;
    const screenshot = formData.get("screenshot") as File;

    console.log("[REPORT_PAYMENT_SUBMITTED]", { unitId, senderName, transactionId, fileSize: screenshot?.size });

    if (!unitId || !senderName || !transactionId) {
      console.error("[REPORT_PAYMENT_ERROR] Missing required fields");
      return { success: false, error: "Missing required fields." };
    }

    // Find the unit and its active/pending lease
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        leases: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            payments: {
              where: { status: "PENDING" },
              orderBy: { dueDate: "asc" },
              take: 1
            }
          }
        }
      }
    });

    if (!unit || unit.leases.length === 0) {
      return { success: false, error: "No active lease found for this unit." };
    }

    const lease = unit.leases[0];
    const pendingPayment = lease.payments[0];

    let receiptUrl = "";
    if (screenshot && screenshot.size > 0) {
      const uploadResult = await uploadFile(screenshot);
      if (uploadResult.success) {
        receiptUrl = uploadResult.url || "";
      }
    }

    if (pendingPayment) {
      // Update existing pending payment
      await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: {
          senderName,
          transactionId,
          receiptUrl,
          status: "PENDING",
          paidAt: new Date()
        }
      });
    } else {
      // Calculate next due date based on latest payment
      const latestPayment = await prisma.payment.findFirst({
        where: { leaseId: lease.id },
        orderBy: { dueDate: "desc" }
      });

      let nextDue = new Date();
      if (latestPayment) {
        const baseDate = latestPayment.type === "ADVANCE" && latestPayment.advanceUntil 
          ? new Date(latestPayment.advanceUntil) 
          : new Date(latestPayment.dueDate);
        
        nextDue = new Date(baseDate.setMonth(baseDate.getMonth() + 1));
      }

      await prisma.payment.create({
        data: {
          leaseId: lease.id,
          tenantId: lease.tenantId,
          amount: unit.rentAmount,
          dueDate: nextDue,
          status: "PENDING",
          type: "MONTHLY",
          senderName,
          transactionId,
          receiptUrl,
          paidAt: new Date()
        }
      });
    }

    revalidatePath(`/u/${unit.qrSlug}`);
    return { success: true };
  } catch (error: any) {
    console.error("Report Public Payment Error:", error);
    return { success: false, error: error.message || "Failed to submit payment report." };
  }
}
