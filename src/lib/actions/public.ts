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
    const paymentType = (formData.get("paymentType") as string) || "MONTHLY";
    const advanceMonths = parseInt(formData.get("advanceMonths") as string) || 1;

    if (!unitId || !senderName || !transactionId) {
      return { success: false, error: "Missing required fields." };
    }

    // ── Uniqueness check: reject duplicate transaction references ────────────
    const existingTxn = await prisma.payment.findFirst({
      where: { transactionId: transactionId.trim() }
    });
    if (existingTxn) {
      return { success: false, error: "This Transaction ID / Ref has already been submitted. Please check your reference number." };
    }

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
    const reportedAmount = parseFloat(formData.get("amount") as string) || 0;

    let receiptUrl = "";
    if (screenshot && screenshot.size > 0) {
      const uploadResult = await uploadFile(screenshot);
      if (uploadResult.success) {
        receiptUrl = uploadResult.url || "";
      }
    }

    // Calculate advanceUntil date for ADVANCE payments
    // This is critical so approvePayment knows it's not a penalty overpayment
    let advanceUntil: Date | null = null;
    if (paymentType === "ADVANCE" && advanceMonths > 1) {
      const baseDate = new Date();
      advanceUntil = new Date(baseDate.setMonth(baseDate.getMonth() + advanceMonths - 1));
    }

    if (pendingPayment) {
      // Update existing pending payment
      await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: {
          senderName,
          transactionId,
          receiptUrl,
          amount: reportedAmount,
          type: paymentType as any,
          advanceUntil: advanceUntil,
          status: "PENDING",
        }
      });
    } else {
      // Calculate next due date based on latest APPROVED payment
      const latestPayment = await prisma.payment.findFirst({
        where: { leaseId: lease.id, status: "APPROVED" },
        orderBy: { dueDate: "desc" }
      });

      let nextDue = new Date();
      if (latestPayment) {
        const baseDate = latestPayment.type === "ADVANCE" && latestPayment.advanceUntil
          ? new Date(latestPayment.advanceUntil)
          : new Date(latestPayment.dueDate);

        nextDue = new Date(new Date(baseDate).setMonth(new Date(baseDate).getMonth() + 1));
      }

      await prisma.payment.create({
        data: {
          leaseId: lease.id,
          tenantId: lease.tenantId,
          amount: reportedAmount,
          dueDate: nextDue,
          status: "PENDING",
          type: paymentType as any,
          advanceUntil: advanceUntil,
          senderName,
          transactionId,
          receiptUrl,
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
