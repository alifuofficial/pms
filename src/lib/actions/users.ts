"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { sendSMS } from "@/lib/sms";
import { normalizePhoneNumber } from "@/lib/phone";
import { resolveSessionUser } from "./auth-helper";

export async function createUser(data: {
  name: string;
  email: string;
  phoneNumber?: string;
  role: "ADMIN" | "MANAGER" | "ACCOUNTANT" | "TENANT";
}) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || sessionUser.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    const tempPassword = await hash("Soreti123!", 10);
    
    const user = await prisma.user.create({
      data: {
        ...data,
        phoneNumber: data.phoneNumber ? normalizePhoneNumber(data.phoneNumber) : undefined,
        passwordHash: tempPassword,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `Created user ${data.name} with role ${data.role}`,
        actionType: "USER_CREATION",
        newValue: JSON.stringify({ name: data.name, email: data.email, role: data.role }),
        metadata: JSON.stringify({ userId: user.id })
      }
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("Create User Error:", error);
    if (error.code === "P2002") {
      return { success: false, error: "Email already exists." };
    }
    return { success: false, error: `Failed to create user: ${error.message || error}` };
  }
}

export async function updateUser(id: string, data: {
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "ACCOUNTANT" | "TENANT";
  phoneNumber?: string;
  password?: string;
}) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || sessionUser.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    const oldUser = await prisma.user.findUnique({ where: { id } });

    const updateData: any = {
      name: data.name,
      email: data.email,
      role: data.role,
      phoneNumber: data.phoneNumber ? normalizePhoneNumber(data.phoneNumber) : undefined,
    };

    if (data.password && data.password.trim() !== "") {
      updateData.passwordHash = await hash(data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (data.password && data.password.trim() !== "" && user.phoneNumber) {
      await sendSMS(user.phoneNumber, "Your Soreti PMS password has been changed by an administrator. If you did not authorize this, please contact IT Support immediately.");
    }

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `Updated user ${user.name}`,
        actionType: "USER_UPDATE",
        oldValue: JSON.stringify({ name: oldUser?.name, email: oldUser?.email, role: oldUser?.role }),
        newValue: JSON.stringify({ name: user.name, email: user.email, role: user.role }),
        metadata: JSON.stringify({ userId: id })
      }
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("Update User Error:", error);
    return { success: false, error: `Failed to update user: ${error.message || error}` };
  }
}

export async function deleteUser(id: string) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || sessionUser.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  // Prevent self-deletion
  if (sessionUser.id === id) {
    return { success: false, error: "You cannot delete your own account." };
  }

  try {
    const oldUser = await prisma.user.findUnique({ where: { id } });

    await prisma.user.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `Deleted user ${oldUser?.name || id}`,
        actionType: "USER_DELETION",
        oldValue: JSON.stringify({ name: oldUser?.name, email: oldUser?.email, role: oldUser?.role }),
        metadata: JSON.stringify({ userId: id })
      }
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("Delete User Error:", error);
    return { success: false, error: `Failed to delete user: ${error.message || error}` };
  }
}

export async function registerTenant(data: {
  name: string;
  email?: string;
  phoneNumber: string;
  unitId: string;
  startDate: Date;
  endDate: Date;
  leaseAgreementUrl?: string;
  payment: {
    amount: number;
    type: "MONTHLY" | "ADVANCE";
    advanceUntil?: Date;
    receiptUrl?: string | null;
  };
}) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const tempPassword = await hash("Soreti123!", 10);
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const normalizedPhone = normalizePhoneNumber(data.phoneNumber);
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email || `${normalizedPhone}@pms.local`,
          phoneNumber: normalizedPhone,
          passwordHash: tempPassword,
          role: "TENANT",
        },
      });

      // 2. Create Lease (PENDING status)
      const lease = await tx.lease.create({
        data: {
          tenantId: user.id,
          unitId: data.unitId,
          startDate: data.startDate,
          endDate: data.endDate,
          status: "PENDING",
          leaseAgreementUrl: data.leaseAgreementUrl,
        },
      });

      // 3. Create initial Payment (PENDING status)
      await tx.payment.create({
        data: {
          tenantId: user.id,
          leaseId: lease.id,
          amount: data.payment.amount,
          dueDate: data.startDate, // Initial payment is for the start period
          type: data.payment.type,
          advanceUntil: data.payment.advanceUntil,
          receiptUrl: data.payment.receiptUrl || null,
          status: "PENDING",
        },
      });

      // 4. Update Unit Status to OCCUPIED (to block it)
      await tx.unit.update({
        where: { id: data.unitId },
        data: { status: "OCCUPIED" },
      });

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Registered tenant ${data.name} for unit ${data.unitId}`,
          actionType: "TENANT_REGISTRATION",
          newValue: JSON.stringify({ name: data.name, phoneNumber: data.phoneNumber, unitId: data.unitId }),
          metadata: JSON.stringify({ name: data.name, unitId: data.unitId, email: data.email })
        }
      });

      return user;
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/admin/units");
    revalidatePath("/accountant/payments");
    revalidatePath("/accountant/dashboard");
    return { success: true, userId: result.id };
  } catch (error: any) {
    console.error("Register Tenant Error:", error);
    if (error.code === "P2002") {
      return { success: false, error: "Email or Phone already registered." };
    }
    return { 
      success: false, 
      error: `Registration failed: ${error.message || error} (Resolved Session User: ${JSON.stringify(sessionUser)})` 
    };
  }
}

export async function assignUnitToTenant(data: {
  tenantId: string;
  unitId: string;
  startDate: Date;
  endDate: Date;
  leaseAgreementUrl?: string;
  payment: {
    amount: number;
    type: "MONTHLY" | "ADVANCE";
    advanceUntil?: Date;
    receiptUrl?: string | null;
  };
}) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Lease (PENDING status)
      const lease = await tx.lease.create({
        data: {
          tenantId: data.tenantId,
          unitId: data.unitId,
          startDate: data.startDate,
          endDate: data.endDate,
          status: "PENDING",
          leaseAgreementUrl: data.leaseAgreementUrl,
        },
      });

      // 2. Create initial Payment (PENDING status)
      await tx.payment.create({
        data: {
          tenantId: data.tenantId,
          leaseId: lease.id,
          amount: data.payment.amount,
          dueDate: data.startDate,
          type: data.payment.type,
          advanceUntil: data.payment.advanceUntil,
          receiptUrl: data.payment.receiptUrl || null,
          status: "PENDING",
        },
      });

      // 3. Update Unit Status to OCCUPIED
      await tx.unit.update({
        where: { id: data.unitId },
        data: { status: "OCCUPIED" },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Assigned unit ${data.unitId} to tenant ${data.tenantId}`,
          actionType: "UNIT_ASSIGNMENT",
          newValue: JSON.stringify({ tenantId: data.tenantId, unitId: data.unitId }),
          metadata: JSON.stringify({ tenantId: data.tenantId, unitId: data.unitId })
        }
      });

      return lease;
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/admin/units");
    revalidatePath("/accountant/payments");
    revalidatePath("/accountant/dashboard");
    return { success: true, leaseId: result.id };
  } catch (error: any) {
    console.error("Assign Unit Error:", error);
    return { success: false, error: `Failed to assign unit: ${error.message || error}` };
  }
}

export async function updateUserProfile(data: {
  password?: string;
  calendarType?: string;
}) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser) return { success: false, error: "Unauthorized" };

  try {
    const oldUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });

    const updateData: any = {};
    if (data.password) {
      updateData.passwordHash = await hash(data.password, 10);
    }
    if (data.calendarType) {
      updateData.calendarType = data.calendarType;
    }

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `Updated user profile (calendarType: ${data.calendarType || oldUser?.calendarType})`,
        actionType: "PROFILE_UPDATE",
        oldValue: JSON.stringify({ calendarType: oldUser?.calendarType }),
        newValue: JSON.stringify({ calendarType: data.calendarType || oldUser?.calendarType }),
        metadata: JSON.stringify({ userId: sessionUser.id })
      }
    });

    revalidatePath("/", "layout"); // Revalidate entire app since calendar affects everywhere
    return { success: true };
  } catch (error: any) {
    console.error("Update Profile Error:", error);
    return { success: false, error: `Failed to update profile: ${error.message || error}` };
  }
}

export async function updateLeaseDates(leaseId: string, startDate: Date, endDate: Date) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const oldLease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { payments: true }
    });

    if (!oldLease) {
      return { success: false, error: "Lease not found." };
    }

    const oldStartDate = new Date(oldLease.startDate);
    
    // Shift payment dueDates and advanceUntil dates by the difference in months
    const { toEthiopian } = await import("@/lib/calendar");
    const oldEt = toEthiopian(oldStartDate);
    const newEt = toEthiopian(new Date(startDate));
    
    const monthDiff = (newEt.year - oldEt.year) * 13 + (newEt.month - oldEt.month);
    
    await prisma.$transaction(async (tx) => {
      // 1. Update lease dates
      await tx.lease.update({
        where: { id: leaseId },
        data: {
          startDate,
          endDate,
        }
      });

      // 2. Shift all associated payments
      if (monthDiff !== 0) {
        const { addEthiopianMonths } = await import("@/lib/calendar");
        for (const payment of oldLease.payments) {
          const updatedDueDate = addEthiopianMonths(new Date(payment.dueDate), monthDiff);
          const updatedAdvanceUntil = payment.advanceUntil 
            ? addEthiopianMonths(new Date(payment.advanceUntil), monthDiff)
            : null;

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              dueDate: updatedDueDate,
              advanceUntil: updatedAdvanceUntil,
            }
          });
        }
      } else {
        // If start date changed but monthDiff is 0 (i.e. day changed within the same month),
        // we should still ensure the initial payment's dueDate matches the new lease startDate.
        for (const payment of oldLease.payments) {
          if (new Date(payment.dueDate).getTime() === oldStartDate.getTime()) {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                dueDate: startDate
              }
            });
          }
        }
      }

      // 3. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Modified lease dates for lease ${leaseId}. Shifted payments by ${monthDiff} months.`,
          actionType: "LEASE_UPDATE",
          oldValue: JSON.stringify({ startDate: oldLease.startDate, endDate: oldLease.endDate }),
          newValue: JSON.stringify({ startDate, endDate }),
          metadata: JSON.stringify({ leaseId, monthDiff })
        }
      });
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/admin/units");
    revalidatePath("/accountant/payments");
    revalidatePath("/accountant/dashboard");
    revalidatePath("/tenant/leases");
    revalidatePath("/tenant/payments");
    revalidatePath("/manager/tenants");
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error: any) {
    console.error("Update Lease Dates Error:", error);
    return { success: false, error: `Failed to update lease dates: ${error.message || error}` };
  }
}

export async function terminateLease(leaseId: string) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { unit: true }
    });

    if (!lease) {
      return { success: false, error: "Lease not found." };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update lease status to TERMINATED
      await tx.lease.update({
        where: { id: leaseId },
        data: { status: "TERMINATED" }
      });

      // 2. Reject any pending payments associated with this lease
      await tx.payment.updateMany({
        where: { leaseId, status: "PENDING" },
        data: { status: "REJECTED" }
      });

      // 3. Update unit status to AVAILABLE if no other active/pending leases occupy it
      const activeLeases = await tx.lease.count({
        where: {
          unitId: lease.unitId,
          status: { in: ["ACTIVE", "PENDING"] },
          id: { not: leaseId }
        }
      });

      if (activeLeases === 0) {
        await tx.unit.update({
          where: { id: lease.unitId },
          data: { status: "AVAILABLE" }
        });
      }

      // 4. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Terminated/Canceled lease ${leaseId} for unit ${lease.unit.unitNumber}`,
          actionType: "LEASE_UPDATE",
          oldValue: JSON.stringify({ status: lease.status }),
          newValue: JSON.stringify({ status: "TERMINATED" }),
          metadata: JSON.stringify({ leaseId, unitId: lease.unitId })
        }
      });
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/admin/units");
    revalidatePath("/accountant/payments");
    revalidatePath("/accountant/dashboard");
    revalidatePath("/tenant/leases");
    revalidatePath("/tenant/payments");
    revalidatePath("/manager/tenants");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Terminate Lease Error:", error);
    return { success: false, error: `Failed to terminate lease: ${error.message || error}` };
  }
}


