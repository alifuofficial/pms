"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function requestRefund(data: {
  leaseId: string;
  tenantId: string;
  amount: number;
  reason: string;
}) {
  try {
    const session = await auth();
    // A Manager or Tenant could request a refund, depending on the UI.
    // For now, let's say the Tenant requests it or Manager initiates it.
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const refund = await prisma.refund.create({
      data: {
        leaseId: data.leaseId,
        tenantId: data.tenantId,
        amount: data.amount,
        reason: data.reason,
        status: "PENDING",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Requested refund of ${data.amount} for lease ${data.leaseId}`,
        metadata: JSON.stringify({ refundId: refund.id, amount: data.amount, reason: data.reason })
      }
    });

    revalidatePath("/tenant/payments");
    revalidatePath("/admin/dashboard");
    return { success: true, refundId: refund.id };
  } catch (error) {
    console.error("Request Refund Error:", error);
    return { success: false, error: "Failed to request refund" };
  }
}

export async function approveRefund(refundId: string) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized: Only Managers can approve refunds." };
    }

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { lease: true, tenant: true }
    });

    if (!refund) return { success: false, error: "Refund not found" };
    if (refund.status !== "PENDING") return { success: false, error: "Refund is not pending" };

    // Update refund status
    await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: "APPROVED",
        approver: { connect: { id: session.user.id } },
      }
    });

    // Deduct from advanceBalance
    const currentAdvance = (refund.lease as any).advanceBalance || 0;
    const newAdvance = Math.max(0, currentAdvance - refund.amount);

    await prisma.lease.update({
      where: { id: refund.leaseId },
      data: { advanceBalance: newAdvance }
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Approved refund of ${refund.amount} (Refund ID: ${refund.id})`,
        metadata: JSON.stringify({ refundId: refund.id, amount: refund.amount, newAdvanceBalance: newAdvance })
      }
    });

    if (refund.tenant.phoneNumber) {
      const { sendSMS } = await import("@/lib/sms");
      await sendSMS(refund.tenant.phoneNumber, "Your refund has been approved by the manager and is being processed.");
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/accountant/payments");
    return { success: true };
  } catch (error) {
    console.error("Approve Refund Error:", error);
    return { success: false, error: "Failed to approve refund" };
  }
}

export async function rejectRefund(refundId: string, reason: string) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized: Only Managers can reject refunds." };
    }

    const refund = await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: "REJECTED",
        approver: { connect: { id: session.user.id } },
      },
      include: { tenant: true }
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Rejected refund of ${refund.amount} (Refund ID: ${refund.id})`,
        metadata: JSON.stringify({ refundId: refund.id, reason })
      }
    });

    if (refund.tenant.phoneNumber) {
      const { sendSMS } = await import("@/lib/sms");
      await sendSMS(refund.tenant.phoneNumber, `Your refund request for ${refund.amount} has been rejected. Reason: ${reason}`);
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/accountant/payments");
    return { success: true };
  } catch (error) {
    console.error("Reject Refund Error:", error);
    return { success: false, error: "Failed to reject refund" };
  }
}
