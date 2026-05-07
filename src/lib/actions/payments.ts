"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function approvePayment(paymentId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { 
        status: "APPROVED",
        paidAt: new Date(),
        approvedBy: session.user.id
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Approved payment of ${payment.amount}`,
        metadata: JSON.stringify({ paymentId, amount: payment.amount })
      }
    });

    if (payment.leaseId) {
      const lease = await prisma.lease.findUnique({ 
        where: { id: payment.leaseId },
        include: { 
          unit: true,
          tenant: true
        }
      });
      if (lease && lease.status === "PENDING") {
        await prisma.lease.update({
          where: { id: payment.leaseId },
          data: { status: "ACTIVE" }
        });
        
        // Notify Lease Activation
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
    revalidatePath("/", "layout"); // Ensure all caches clear
    
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

    // Notify Payment Rejected
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

    const payment = await prisma.payment.update({
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
