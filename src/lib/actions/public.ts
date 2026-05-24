"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { uploadFile } from "./storage";
import { addEthiopianMonths } from "@/lib/calendar";

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

    // We will calculate advanceUntil after determining nextDue
    let advanceUntil: Date | null = null;

    // ── Calculate Target Due Date & Coverage ────────────────────────────────
    // 1. Determine the first unpaid month (nextDue)
    const latestPayment = await prisma.payment.findFirst({
      where: { leaseId: lease.id, status: "APPROVED" },
      orderBy: { dueDate: "desc" }
    });

    let nextDue = new Date();
    if (latestPayment) {
      const baseDate = latestPayment.advanceUntil
        ? new Date(latestPayment.advanceUntil)
        : new Date(latestPayment.dueDate);

      nextDue = addEthiopianMonths(new Date(baseDate), 1);
    } else {
      // If no approved payments, start from lease start date
      nextDue = new Date(lease.startDate);
    }

    // 2. Calculate coverage (advanceUntil) if paying for multiple months
    if (advanceMonths > 1) {
      advanceUntil = addEthiopianMonths(new Date(nextDue), advanceMonths - 1);
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
          dueDate: nextDue, // Ensure the oldest unpaid month is always the primary reference
          type: paymentType as any,
          advanceUntil: advanceUntil,
          status: "PENDING",
        }
      });
    } else {
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
