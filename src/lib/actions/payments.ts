"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function approvePayment(paymentId: string, penaltyAmountReceived?: number) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const currentPayment = await prisma.payment.findUnique({ 
      where: { id: paymentId },
      include: { 
        lease: { 
          include: { 
            unit: true,
            // Fetch UNPAID penalties for this lease so we can settle them
            penalties: { where: { status: "UNPAID" }, orderBy: { dueDate: "asc" } }
          } 
        } 
      }
    });
    if (!currentPayment) return { success: false, error: "Payment not found" };

    const monthlyRent = currentPayment.lease.unit.rentAmount;
    const isAdvance = currentPayment.type === "ADVANCE" && currentPayment.advanceUntil;
    
    // FIX #3: For ADVANCE payments, expected rent = monthlyRent * months covered
    // We calculate the number of months from dueDate to advanceUntil
    let expectedRent = monthlyRent;
    if (isAdvance && currentPayment.advanceUntil) {
      const dueMonth = new Date(currentPayment.dueDate).getMonth();
      const dueYear = new Date(currentPayment.dueDate).getFullYear();
      const untilMonth = new Date(currentPayment.advanceUntil).getMonth();
      const untilYear = new Date(currentPayment.advanceUntil).getFullYear();
      const monthsDiff = (untilYear - dueYear) * 12 + (untilMonth - dueMonth) + 1;
      expectedRent = monthlyRent * Math.max(1, monthsDiff);
    }

    // FIX #2 & #3: Auto-detect penalty only if the payment exceeds expected rent
    // If accountant manually specified a penalty, use that. Otherwise auto-detect.
    const actualPenalty = penaltyAmountReceived !== undefined
      ? penaltyAmountReceived
      : Math.max(0, currentPayment.amount - expectedRent);

    const rentFinal = currentPayment.amount - actualPenalty;

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { 
        status: "APPROVED",
        amount: rentFinal,
        paidAt: new Date(),
        approver: { connect: { id: session.user.id } },
      },
    });

    // FIX #2 (Ghost Arrears): If there are existing UNPAID penalties, settle them first
    // before creating new ones. This ensures old UNPAID records don't haunt the tenant.
    if (actualPenalty > 0) {
      const unpaidPenalties = currentPayment.lease.penalties;
      let remainingPenalty = actualPenalty;

      // Oldest-first settlement
      for (const unpaidRecord of unpaidPenalties) {
        if (remainingPenalty <= 0) break;
        const outstanding = unpaidRecord.amount - unpaidRecord.paidAmount;
        const toSettle = Math.min(outstanding, remainingPenalty);

        await prisma.penalty.update({
          where: { id: unpaidRecord.id },
          data: {
            paidAmount: unpaidRecord.paidAmount + toSettle,
            status: (unpaidRecord.paidAmount + toSettle) >= unpaidRecord.amount ? "PAID" : "PARTIAL",
            paidAt: new Date()
          }
        });
        remainingPenalty -= toSettle;
      }

      // If there's still a remaining penalty amount beyond existing records, create a new PAID entry
      if (remainingPenalty > 0) {
        await prisma.penalty.create({
          data: {
            leaseId: payment.leaseId,
            tenantId: payment.tenantId,
            amount: remainingPenalty,
            paidAmount: remainingPenalty,
            status: "PAID",
            dueDate: currentPayment.dueDate,
            paidAt: new Date()
          }
        });
      }
    }

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Approved payment of ${rentFinal} (penalty: ${actualPenalty})`,
        metadata: JSON.stringify({ paymentId, rentFinal, actualPenalty })
      }
    });

    if (payment.leaseId) {
      const lease = await prisma.lease.findUnique({ 
        where: { id: payment.leaseId },
        include: { unit: true, tenant: true }
      });
      if (lease && lease.status === "PENDING") {
        await prisma.lease.update({
          where: { id: payment.leaseId },
          data: { status: "ACTIVE" }
        });
        
        if (lease.tenant.phoneNumber) {
          const { sendSMS } = await import("@/lib/sms");
          await sendSMS(lease.tenant.phoneNumber, "lease-activation", {
            tenant_name: lease.tenant.name || "Tenant",
            unit_number: lease.unit.unitNumber
          });
        }

        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: `Activated lease for payment ${paymentId}`,
            metadata: JSON.stringify({ leaseId: payment.leaseId })
          }
        });
      }

      // Notify Payment Approved
      const fullPayment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { 
          tenant: true,
          lease: { include: { unit: true } }
        }
      });
      if (fullPayment?.tenant?.phoneNumber) {
        const { sendSMS } = await import("@/lib/sms");
        await sendSMS(fullPayment.tenant.phoneNumber, "payment-approved", {
          tenant_name: fullPayment.tenant.name || "Tenant",
          unit_number: fullPayment.lease?.unit?.unitNumber || "N/A",
          amount: fullPayment.amount.toLocaleString()
        });
      }
    }

    revalidatePath("/admin/payments");
    revalidatePath("/admin/tenants");
    revalidatePath("/accountant/payments");
    revalidatePath("/accountant/dashboard");
    revalidatePath("/admin/dashboard");
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error) {
    console.error("Approve Payment Error:", error);
    return { success: false, error: "Failed to approve payment" };
  }
}

export async function rejectPayment(paymentId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "REJECTED" },
      include: {
        tenant: true,
        lease: { include: { unit: true } }
      }
    });

    if (payment.tenant.phoneNumber) {
      const { sendSMS } = await import("@/lib/sms");
      await sendSMS(payment.tenant.phoneNumber, "payment-rejected", {
        tenant_name: payment.tenant.name || "Tenant",
        unit_number: payment.lease?.unit?.unitNumber || "N/A"
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Rejected payment ${paymentId}`,
        metadata: JSON.stringify({ paymentId })
      }
    });

    revalidatePath("/admin/payments");
    revalidatePath("/accountant/payments");
    revalidatePath("/accountant/dashboard");
    revalidatePath("/tenant/payments");
    revalidatePath("/admin/dashboard");
    
    return { success: true };
  } catch (error) {
    console.error("Reject Payment Error:", error);
    return { success: false, error: "Failed to reject payment" };
  }
}

export async function submitPaymentReceipt(paymentId: string, receiptUrl: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    await prisma.payment.update({
      where: { id: paymentId },
      data: { 
        receiptUrl,
        status: "PENDING",
        paidAt: new Date()
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Submitted receipt for payment ${paymentId}`,
        metadata: JSON.stringify({ paymentId, receiptUrl })
      }
    });

    revalidatePath("/tenant/payments");
    revalidatePath("/tenant/dashboard");
    revalidatePath("/accountant/payments");
    revalidatePath("/accountant/dashboard");
    revalidatePath("/admin/dashboard");
    
    return { success: true };
  } catch (error) {
    console.error("Submit Receipt Error:", error);
    return { success: false, error: "Failed to submit receipt" };
  }
}

export async function togglePenaltyPaid(penaltyId: string, paid: boolean) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Now correctly targets the Penalty table
    const penalty = await prisma.penalty.findUnique({ where: { id: penaltyId } });
    if (!penalty) return { success: false, error: "Penalty record not found" };

    await prisma.penalty.update({
      where: { id: penaltyId },
      data: { 
        status: paid ? "PAID" : "UNPAID",
        paidAmount: paid ? penalty.amount : 0,
        paidAt: paid ? new Date() : null
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `${paid ? "Marked" : "Unmarked"} penalty ${penaltyId} as paid`,
        metadata: JSON.stringify({ penaltyId, paid })
      }
    });

    revalidatePath("/admin/payments");
    revalidatePath("/accountant/payments");
    revalidatePath("/admin/dashboard");
    
    return { success: true };
  } catch (error) {
    console.error("Toggle Penalty Paid Error:", error);
    return { success: false, error: "Failed to update penalty status" };
  }
}
