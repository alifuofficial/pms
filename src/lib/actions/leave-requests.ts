"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolveSessionUser } from "./auth-helper";

export async function createLeaveRequest(data: {
  leaseId: string;
  requestedMoveOutDate: Date | string;
  reason?: string;
  isOfficeRequest?: boolean;
}) {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser) return { success: false, error: "Unauthorized" };

    const lease = await prisma.lease.findUnique({
      where: { id: data.leaseId },
      include: { unit: true, tenant: true },
    });

    if (!lease) return { success: false, error: "Lease not found" };

    if (!data.isOfficeRequest) {
      // Tenant request
      if (sessionUser.role !== "TENANT" || lease.tenantId !== sessionUser.id) {
        return { success: false, error: "Unauthorized to request leave for this lease" };
      }
    } else {
      // Office request (admin/manager)
      if (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER") {
        return { success: false, error: "Unauthorized: Only admins and managers can create office requests" };
      }
    }

    const moveOutDate = new Date(data.requestedMoveOutDate);
    const today = new Date();
    // Reset hours to compare dates properly
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(moveOutDate);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let shortNoticeFee = 0;
    if (diffDays < 30) {
      shortNoticeFee = lease.unit.rentAmount;
    }

    // Check if there is already a pending or approved leave request for this lease
    const existing = await prisma.leaveRequest.findFirst({
      where: {
        leaseId: lease.id,
        status: { in: ["PENDING", "APPROVED", "CLEARANCE_ISSUED"] }
      }
    });

    if (existing) {
      return { success: false, error: "A leave request already exists for this lease." };
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        leaseId: lease.id,
        tenantId: lease.tenantId,
        requestedMoveOutDate: moveOutDate,
        reason: data.reason || null,
        status: "PENDING",
        shortNoticeFee,
        shortNoticePaid: false,
      }
    });

    if (shortNoticeFee > 0) {
      await prisma.payment.create({
        data: {
          leaseId: lease.id,
          tenantId: lease.tenantId,
          amount: shortNoticeFee,
          dueDate: today,
          status: "PENDING",
          type: "FINAL_SETTLEMENT",
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `Created leave request for unit ${lease.unit.unitNumber}. Short notice fee: ETB ${shortNoticeFee}.`,
        actionType: "LEAVE_REQUEST",
        metadata: JSON.stringify({ leaveRequestId: leaveRequest.id, leaseId: lease.id, shortNoticeFee })
      }
    });

    revalidatePath("/tenant/leases");
    revalidatePath("/admin/leave-clearance");
    revalidatePath("/manager/leave-clearance");
    return { success: true, leaveRequestId: leaveRequest.id };
  } catch (error) {
    console.error("Create Leave Request Error:", error);
    return { success: false, error: "Failed to create leave request" };
  }
}

export async function getLeaveRequests() {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER")) {
      return { success: false, error: "Unauthorized" };
    }

    const requests = await prisma.leaveRequest.findMany({
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: true
              }
            },
            payments: true,
            penalties: true,
            utilityBills: true,
          }
        },
        tenant: true,
        approver: true,
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, data: requests };
  } catch (error) {
    console.error("Get Leave Requests Error:", error);
    return { success: false, error: "Failed to fetch leave requests" };
  }
}

export async function approveLeaveRequest(id: string, adminNote?: string) {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER")) {
      return { success: false, error: "Unauthorized" };
    }

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { lease: { include: { unit: true } } }
    });

    if (!request) return { success: false, error: "Leave request not found" };
    if (request.status !== "PENDING") return { success: false, error: "Request is not pending approval" };

    await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        adminNote,
        approvedBy: sessionUser.id,
        approvedAt: new Date(),
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `Approved leave request ${id} for unit ${request.lease.unit.unitNumber}`,
        actionType: "LEAVE_REQUEST_APPROVAL",
        metadata: JSON.stringify({ leaveRequestId: id, adminNote })
      }
    });

    revalidatePath("/admin/leave-clearance");
    revalidatePath("/tenant/leases");
    return { success: true };
  } catch (error) {
    console.error("Approve Leave Request Error:", error);
    return { success: false, error: "Failed to approve leave request" };
  }
}

export async function rejectLeaveRequest(id: string, adminNote: string) {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER")) {
      return { success: false, error: "Unauthorized" };
    }

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { lease: { include: { unit: true } } }
    });

    if (!request) return { success: false, error: "Leave request not found" };
    if (request.status !== "PENDING") return { success: false, error: "Request is not pending approval" };

    await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        adminNote,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `Rejected leave request ${id} for unit ${request.lease.unit.unitNumber}`,
        actionType: "LEAVE_REQUEST_REJECTION",
        metadata: JSON.stringify({ leaveRequestId: id, adminNote })
      }
    });

    revalidatePath("/admin/leave-clearance");
    revalidatePath("/tenant/leases");
    return { success: true };
  } catch (error) {
    console.error("Reject Leave Request Error:", error);
    return { success: false, error: "Failed to reject leave request" };
  }
}

export async function issueClearanceAndVacate(id: string) {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER")) {
      return { success: false, error: "Unauthorized" };
    }

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            unit: true,
            payments: true,
            penalties: true,
            utilityBills: true,
          }
        }
      }
    });

    if (!request) return { success: false, error: "Leave request not found" };
    if (request.status !== "APPROVED") {
      return { success: false, error: "Leave request must be approved before issuing clearance" };
    }

    // Double check unpaid items
    const hasUnpaidPayments = request.lease.payments.some((p: any) => p.status === "PENDING");
    const hasUnpaidPenalties = request.lease.penalties.some((p: any) => p.status !== "PAID");
    const hasUnpaidUtilityBills = request.lease.utilityBills.some((u: any) => u.status !== "PAID");

    if (hasUnpaidPayments || hasUnpaidPenalties || hasUnpaidUtilityBills) {
      return { success: false, error: "Cannot issue clearance. There are outstanding unpaid payments, penalties, or utility bills." };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update LeaveRequest status
      await tx.leaveRequest.update({
        where: { id },
        data: {
          status: "CLEARANCE_ISSUED",
          clearanceIssuedAt: new Date(),
        }
      });

      // 2. Identify all units and leases in the group
      const parentUnitId = request.lease.unit.mergedIntoId || request.lease.unit.id;
      const groupUnits = await tx.unit.findMany({
        where: {
          OR: [
            { id: parentUnitId },
            { mergedIntoId: parentUnitId }
          ]
        }
      });
      
      const groupLeases = await tx.lease.findMany({
        where: {
          tenantId: request.lease.tenantId,
          unitId: { in: groupUnits.map((u: any) => u.id) },
          status: { in: ["ACTIVE", "PENDING", "SEALED"] }
        }
      });

      const leaseIdsToTerminate = groupLeases.map((l: any) => l.id);

      // Terminate all leases in the group
      await tx.lease.updateMany({
        where: { id: { in: leaseIdsToTerminate } },
        data: {
          status: "TERMINATED",
          terminatedAt: new Date()
        }
      });

      // 3. Mark all units in the group
      for (const unitItem of groupUnits) {
        await tx.unit.update({
          where: { id: unitItem.id },
          data: {
            status: unitItem.companyOwned ? "COMPANY_OWNED" : "AVAILABLE"
          }
        });
      }

      // 4. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Issued clearance and vacated unit ${request.lease.unit.unitNumber} and merged child units (Lease: ${request.leaseId})`,
          actionType: "CLEARANCE_ISSUED",
          metadata: JSON.stringify({ leaveRequestId: id, leaseId: request.leaseId, unitId: request.lease.unitId })
        }
      });
    });

    revalidatePath("/admin/leave-clearance");
    revalidatePath("/admin/units");
    revalidatePath("/admin/properties");
    revalidatePath("/tenant/leases");
    return { success: true };
  } catch (error) {
    console.error("Issue Clearance Error:", error);
    return { success: false, error: "Failed to issue clearance and vacate unit" };
  }
}
