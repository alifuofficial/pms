"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { sendSMS } from "@/lib/sms";
import { normalizePhoneNumber } from "@/lib/phone";
import { resolveSessionUser } from "./auth-helper";
import { toEthiopian, getDaysInEthiopianMonth } from "@/lib/calendar";
import { getLeaseUncollectedBalance } from "@/lib/arrears";

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
        data: { status: "TERMINATED", terminatedAt: new Date() }
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
        const u = await tx.unit.findUnique({ where: { id: lease.unitId } });
        await tx.unit.update({
          where: { id: lease.unitId },
          data: { status: u?.companyOwned ? "COMPANY_OWNED" : "AVAILABLE" }
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

export async function updateLeaseUnit(leaseId: string, newUnitId: string) {
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

    if (lease.unitId === newUnitId) {
      return { success: true, message: "Unit is already the same." };
    }

    const newUnit = await prisma.unit.findUnique({
      where: { id: newUnitId }
    });

    if (!newUnit) {
      return { success: false, error: "New unit not found." };
    }

    if (newUnit.status !== "AVAILABLE") {
      return { success: false, error: `New unit ${newUnit.unitNumber} is not available (status: ${newUnit.status}).` };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update lease unitId
      await tx.lease.update({
        where: { id: leaseId },
        data: { unitId: newUnitId }
      });

      // 2. Set old unit to AVAILABLE if no other active/pending leases occupy it
      const activeLeasesOldUnit = await tx.lease.count({
        where: {
          unitId: lease.unitId,
          status: { in: ["ACTIVE", "PENDING"] },
          id: { not: leaseId }
        }
      });

      if (activeLeasesOldUnit === 0) {
        const u = await tx.unit.findUnique({ where: { id: lease.unitId } });
        await tx.unit.update({
          where: { id: lease.unitId },
          data: { status: u?.companyOwned ? "COMPANY_OWNED" : "AVAILABLE" }
        });
      }

      // 3. Set new unit to OCCUPIED
      await tx.unit.update({
        where: { id: newUnitId },
        data: { status: "OCCUPIED" }
      });

      // 4. Update pending monthly payments' amounts if they matched the old rent amount
      await tx.payment.updateMany({
        where: {
          leaseId,
          status: "PENDING",
          type: "MONTHLY",
          amount: lease.unit.rentAmount
        },
        data: {
          amount: newUnit.rentAmount
        }
      });

      // 5. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Transferred lease ${leaseId} from unit ${lease.unit.unitNumber} to unit ${newUnit.unitNumber}`,
          actionType: "LEASE_UPDATE",
          oldValue: JSON.stringify({ unitId: lease.unitId, rentAmount: lease.unit.rentAmount }),
          newValue: JSON.stringify({ unitId: newUnitId, rentAmount: newUnit.rentAmount }),
          metadata: JSON.stringify({ leaseId, oldUnitId: lease.unitId, newUnitId })
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
    console.error("Update Lease Unit Error:", error);
    return { success: false, error: `Failed to update lease unit: ${error.message || error}` };
  }
}

export async function lockoutLease(
  leaseId: string,
  lockoutDateRaw: string | Date,
  inventoryList: string,
  storageLocation: string,
  estimatedValue?: number
) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const lockoutDate = new Date(lockoutDateRaw);
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        unit: true,
        tenant: true,
        payments: true,
        penalties: true,
        utilityBills: true
      }
    });

    if (!lease) return { success: false, error: "Lease not found" };
    if (lease.status !== "ACTIVE" && lease.status !== "EXPIRED" && lease.status !== "SEALED") {
      return { success: false, error: `Lease is not in a lockable state (current status: ${lease.status})` };
    }

    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    const balance = getLeaseUncollectedBalance(lease, settings, lockoutDate);

    // Apply pro-rated adjustment for the final month if lockout month is unpaid
    let finalRentArrears = balance.rentUncollected;
    const lockoutEt = toEthiopian(lockoutDate);

    const approvedPayments = lease.payments.filter(p => p.status === "APPROVED");
    const latestApproved = approvedPayments.length > 0
      ? [...approvedPayments].sort((a, b) => new Date(a.advanceUntil || a.dueDate).getTime() - new Date(b.advanceUntil || b.dueDate).getTime())[approvedPayments.length - 1]
      : null;

    const coverageUntil = latestApproved ? new Date(latestApproved.advanceUntil || latestApproved.dueDate) : null;
    let isLockoutMonthUnpaid = false;
    if (!coverageUntil) {
      isLockoutMonthUnpaid = true;
    } else {
      const covEt = toEthiopian(coverageUntil);
      if (lockoutEt.year > covEt.year || (lockoutEt.year === covEt.year && lockoutEt.month > covEt.month)) {
        isLockoutMonthUnpaid = true;
      }
    }

    if (isLockoutMonthUnpaid) {
      const daysInMonth = getDaysInEthiopianMonth(lockoutEt.year, lockoutEt.month);
      const daysUsed = lockoutEt.day;
      if (daysUsed < daysInMonth) {
        const monthlyRent = lease.unit.rentAmount;
        const fullMonthCharged = monthlyRent;
        const proRatedRent = (daysUsed / daysInMonth) * monthlyRent;
        const adjustment = fullMonthCharged - proRatedRent;
        finalRentArrears = Math.max(0, finalRentArrears - adjustment);
      }
    }

    const totalSettlementAmount = Math.round((finalRentArrears + balance.penaltiesUncollected) * 100) / 100;

    await prisma.$transaction(async (tx) => {
      // 1. Create static FINAL_SETTLEMENT payment
      await tx.payment.create({
        data: {
          leaseId,
          tenantId: lease.tenantId,
          amount: totalSettlementAmount,
          dueDate: lockoutDate,
          status: "PENDING",
          type: "FINAL_SETTLEMENT",
          senderName: "System Eviction Lockout",
          transactionId: `LOCK-${leaseId.slice(0, 4).toUpperCase()}`
        }
      });

      // 2. Create SeizedProperty inventory record
      await tx.seizedProperty.create({
        data: {
          leaseId,
          tenantId: lease.tenantId,
          lockoutDate,
          inventoryList,
          estimatedValue: estimatedValue || null,
          storageLocation,
          status: "STORED"
        }
      });

      // 3. Update Lease: set status to LOCKED_OUT, terminatedAt, clear advanceBalance
      await tx.lease.update({
        where: { id: leaseId },
        data: {
          status: "LOCKED_OUT",
          terminatedAt: lockoutDate,
          advanceBalance: 0
        }
      });

      // 4. Update Unit: set status to AVAILABLE (vacant)
      await tx.unit.update({
        where: { id: lease.unitId },
        data: {
          status: "AVAILABLE"
        }
      });

      // 5. Reject any other pending payments for this lease
      await tx.payment.updateMany({
        where: {
          leaseId,
          status: "PENDING",
          type: { not: "FINAL_SETTLEMENT" }
        },
        data: {
          status: "REJECTED"
        }
      });

      // 6. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Executed lockout & eviction on lease ${leaseId} for tenant ${lease.tenant.name}. Seized property stored at ${storageLocation}. Final settlement amount: ${totalSettlementAmount}.`,
          actionType: "LEASE_UPDATE",
          newValue: JSON.stringify({
            status: "LOCKED_OUT",
            terminatedAt: lockoutDate,
            totalSettlementAmount,
            storageLocation
          })
        }
      });
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/admin/units");
    revalidatePath("/admin/dashboard");
    revalidatePath("/manager/tenants");
    revalidatePath("/accountant/payments");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Lockout Lease Error:", error);
    return { success: false, error: `Failed to execute lease lockout: ${error.message || error}` };
  }
}

export async function getLeaseLockoutPreview(leaseId: string, lockoutDateRaw: string | Date) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const lockoutDate = new Date(lockoutDateRaw);
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        unit: true,
        tenant: true,
        payments: true,
        penalties: true,
        utilityBills: true
      }
    });

    if (!lease) return { success: false, error: "Lease not found" };

    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    const balance = getLeaseUncollectedBalance(lease, settings, lockoutDate);

    // Apply pro-rated adjustment for the final month if lockout month is unpaid
    let finalRentArrears = balance.rentUncollected;
    const lockoutEt = toEthiopian(lockoutDate);

    const approvedPayments = lease.payments.filter(p => p.status === "APPROVED");
    const latestApproved = approvedPayments.length > 0
      ? [...approvedPayments].sort((a, b) => new Date(a.advanceUntil || a.dueDate).getTime() - new Date(b.advanceUntil || b.dueDate).getTime())[approvedPayments.length - 1]
      : null;

    const coverageUntil = latestApproved ? new Date(latestApproved.advanceUntil || latestApproved.dueDate) : null;
    let isLockoutMonthUnpaid = false;
    if (!coverageUntil) {
      isLockoutMonthUnpaid = true;
    } else {
      const covEt = toEthiopian(coverageUntil);
      if (lockoutEt.year > covEt.year || (lockoutEt.year === covEt.year && lockoutEt.month > covEt.month)) {
        isLockoutMonthUnpaid = true;
      }
    }

    let proRatedRent = 0;
    let fullMonthRent = lease.unit.rentAmount;
    let daysUsed = 0;
    let daysInMonth = 0;

    if (isLockoutMonthUnpaid) {
      daysInMonth = getDaysInEthiopianMonth(lockoutEt.year, lockoutEt.month);
      daysUsed = lockoutEt.day;
      if (daysUsed < daysInMonth) {
        proRatedRent = (daysUsed / daysInMonth) * fullMonthRent;
        const adjustment = fullMonthRent - proRatedRent;
        finalRentArrears = Math.max(0, finalRentArrears - adjustment);
      } else {
        proRatedRent = fullMonthRent;
      }
    }

    const totalSettlementAmount = Math.round((finalRentArrears + balance.penaltiesUncollected) * 100) / 100;

    // Separate full months arrears from pro-rated rent
    const fullMonthsRentArrears = Math.max(0, finalRentArrears - proRatedRent);

    return {
      success: true,
      data: {
        isLockoutMonthUnpaid,
        daysUsed,
        daysInMonth,
        proRatedRent,
        fullMonthsRentArrears,
        penaltiesUncollected: balance.penaltiesUncollected,
        totalSettlementAmount
      }
    };
  } catch (error: any) {
    console.error("Lockout Preview Error:", error);
    return { success: false, error: `Failed to calculate preview: ${error.message || error}` };
  }
}

export async function releaseSeizedProperty(propertyId: string) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const property = await prisma.seizedProperty.findUnique({
      where: { id: propertyId },
      include: { lease: { include: { payments: true } } }
    });

    if (!property) return { success: false, error: "Seized property record not found." };
    if (property.status !== "STORED") {
      return { success: false, error: `Property status is not stored (current: ${property.status})` };
    }

    // Ensure final settlement payment is paid / approved
    const settlementPayment = property.lease.payments.find(
      p => p.type === "FINAL_SETTLEMENT" && p.status === "APPROVED"
    );

    if (!settlementPayment) {
      return { success: false, error: "Cannot release property. Outstanding final settlement payment is not paid." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.seizedProperty.update({
        where: { id: propertyId },
        data: {
          status: "RETRIEVED",
          updatedAt: new Date()
        }
      });

      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Released seized property ${propertyId} back to tenant after settlement.`,
          actionType: "LEASE_UPDATE"
        }
      });
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/manager/tenants");
    return { success: true };
  } catch (error: any) {
    console.error("Release Seized Property Error:", error);
    return { success: false, error: `Failed to release property: ${error.message || error}` };
  }
}

export async function recordAuctionSale(
  propertyId: string,
  saleAmount: number,
  buyerName: string
) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const property = await prisma.seizedProperty.findUnique({
      where: { id: propertyId },
      include: { lease: { include: { payments: true } } }
    });

    if (!property) return { success: false, error: "Seized property record not found." };
    if (property.status !== "STORED") {
      return { success: false, error: `Property status is not stored (current: ${property.status})` };
    }

    const settlementPayment = property.lease.payments.find(
      p => p.type === "FINAL_SETTLEMENT" && p.status !== "APPROVED"
    );

    if (!settlementPayment) {
      return { success: false, error: "No unpaid final settlement payment found for this lease." };
    }

    const debtAmount = settlementPayment.amount;

    await prisma.$transaction(async (tx) => {
      let surplusRefundId = null;

      if (saleAmount >= debtAmount) {
        // Debt is fully covered by auction sale
        await tx.payment.update({
          where: { id: settlementPayment.id },
          data: {
            status: "APPROVED",
            paidAt: new Date()
          }
        });

        // Surplus is refunded to the tenant
        const surplus = saleAmount - debtAmount;
        if (surplus > 0) {
          const refund = await tx.refund.create({
            data: {
              leaseId: property.leaseId,
              tenantId: property.tenantId,
              amount: surplus,
              reason: `Auction sale surplus refund for seized inventory. (Total sale: ${saleAmount}, Debt paid: ${debtAmount})`,
              status: "APPROVED", // Auto-approved surplus refund
              approvedBy: sessionUser.id
            }
          });
          surplusRefundId = refund.id;
        }
      } else {
        // Partially cover the debt
        const remainingDebt = debtAmount - saleAmount;
        await tx.payment.update({
          where: { id: settlementPayment.id },
          data: {
            amount: remainingDebt // Decrement the remaining owed amount
          }
        });
      }

      await tx.seizedProperty.update({
        where: { id: propertyId },
        data: {
          status: "SOLD",
          saleAmount,
          soldAt: new Date(),
          buyerName,
          surplusRefundId,
          updatedAt: new Date()
        }
      });

      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Recorded auction sale of seized property ${propertyId} for ${saleAmount} ETB. Buyer: ${buyerName}.`,
          actionType: "LEASE_UPDATE",
          newValue: JSON.stringify({ saleAmount, buyerName, surplusRefundId })
        }
      });
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/manager/tenants");
    revalidatePath("/accountant/payments");
    return { success: true };
  } catch (error: any) {
    console.error("Record Auction Sale Error:", error);
    return { success: false, error: `Failed to record auction sale: ${error.message || error}` };
  }
}
export async function addLockedOutFee(
  leaseId: string,
  feeType: "RENTAL" | "UTILITY",
  amount: number,
  note: string
) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "ACCOUNTANT")) {
    return { success: false, error: "Unauthorized — only ADMIN or ACCOUNTANT can add fees." };
  }

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { payments: true, tenant: true },
    });

    if (!lease) return { success: false, error: "Lease not found." };
    if (lease.status !== "LOCKED_OUT") {
      return { success: false, error: "Can only add fees to locked-out leases." };
    }
    if (!amount || amount <= 0) {
      return { success: false, error: "Fee amount must be greater than zero." };
    }

    const settlement = lease.payments.find((p) => p.type === "FINAL_SETTLEMENT");

    await prisma.$transaction(async (tx) => {
      // 1. Create the individual LockoutFee record (the source of truth)
      await tx.lockoutFee.create({
        data: {
          leaseId,
          tenantId: lease.tenantId,
          feeType,
          amount,
          note,
          addedBy: sessionUser.id,
          addedByName: sessionUser.name || sessionUser.email || "",
        },
      });

      // 2. Reflect the fee in the FINAL_SETTLEMENT payment total
      if (settlement) {
        await tx.payment.update({
          where: { id: settlement.id },
          data: {
            amount: settlement.amount + amount,
            ...(settlement.status === "APPROVED" ? { status: "PENDING", paidAt: null } : {}),
          },
        });
      } else {
        await tx.payment.create({
          data: {
            leaseId,
            tenantId: lease.tenantId,
            amount,
            dueDate: new Date(),
            status: "PENDING",
            type: "FINAL_SETTLEMENT",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Added ${feeType} fee of ${amount} to locked-out lease ${leaseId} (Tenant: ${lease.tenant?.name}). Note: ${note}`,
          actionType: "LEASE_UPDATE",
          newValue: JSON.stringify({ leaseId, feeType, amount, note }),
        },
      });
    });

    revalidatePath("/admin/lockedout");
    revalidatePath("/admin/tenants");
    revalidatePath("/accountant/payments");
    return { success: true };
  } catch (error: any) {
    console.error("addLockedOutFee error:", error);
    return { success: false, error: `Failed to add fee: ${error.message || error}` };
  }
}

export async function removeLockoutFee(feeId: string) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "ACCOUNTANT")) {
    return { success: false, error: "Unauthorized — only ADMIN or ACCOUNTANT can remove fees." };
  }

  try {
    // Load the fee record with its lease's settlement payment
    const fee = await prisma.lockoutFee.findUnique({
      where: { id: feeId },
      include: {
        lease: {
          include: { payments: true, tenant: true },
        },
      },
    });

    if (!fee) return { success: false, error: "Fee record not found." };

    const settlement = fee.lease.payments.find((p) => p.type === "FINAL_SETTLEMENT");

    await prisma.$transaction(async (tx) => {
      // 1. Delete the LockoutFee record
      await tx.lockoutFee.delete({ where: { id: feeId } });

      // 2. Subtract from the FINAL_SETTLEMENT payment
      if (settlement) {
        const newAmount = Math.max(0, settlement.amount - fee.amount);
        await tx.payment.update({
          where: { id: settlement.id },
          data: { amount: newAmount },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Removed ${fee.feeType} fee of ${fee.amount} from locked-out lease ${fee.leaseId} (Tenant: ${fee.lease.tenant?.name}). Note was: "${fee.note}"`,
          actionType: "LEASE_UPDATE",
          oldValue: JSON.stringify({ feeId, feeType: fee.feeType, amount: fee.amount, note: fee.note }),
        },
      });
    });

    revalidatePath("/admin/lockedout");
    revalidatePath("/admin/tenants");
    revalidatePath("/accountant/payments");
    return { success: true };
  } catch (error: any) {
    console.error("removeLockoutFee error:", error);
    return { success: false, error: `Failed to remove fee: ${error.message || error}` };
  }
}

export async function sealLease(leaseId: string, sealDateRaw: string | Date, note?: string) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const sealDate = new Date(sealDateRaw);
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        unit: true,
        tenant: true
      }
    });

    if (!lease) return { success: false, error: "Lease not found" };
    if (lease.status !== "ACTIVE" && lease.status !== "EXPIRED") {
      return { success: false, error: `Lease is not in a sealable state (current status: ${lease.status})` };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update Lease Status to SEALED
      await tx.lease.update({
        where: { id: leaseId },
        data: {
          status: "SEALED"
        }
      });

      // 2. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Sealed shop on lease ${leaseId} for tenant ${lease.tenant.name} on ${sealDate.toLocaleDateString()}. Note: ${note || "None"}`,
          actionType: "LEASE_UPDATE",
          oldValue: JSON.stringify({ status: lease.status }),
          newValue: JSON.stringify({ status: "SEALED", sealDate, note })
        }
      });
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/admin/units");
    revalidatePath("/admin/lockedout");
    revalidatePath("/manager/lockedout");
    revalidatePath("/admin/dashboard");
    revalidatePath("/manager/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Seal Lease Error:", error);
    return { success: false, error: `Failed to seal lease: ${error.message || error}` };
  }
}

export async function unsealLease(leaseId: string) {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        unit: true,
        tenant: true
      }
    });

    if (!lease) return { success: false, error: "Lease not found" };
    if (lease.status !== "SEALED") {
      return { success: false, error: `Lease is not sealed (current status: ${lease.status})` };
    }

    const newStatus = new Date(lease.endDate) < new Date() ? "EXPIRED" : "ACTIVE";

    await prisma.$transaction(async (tx) => {
      // 1. Update Lease Status back to ACTIVE/EXPIRED
      await tx.lease.update({
        where: { id: leaseId },
        data: {
          status: newStatus
        }
      });

      // 2. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Unsealed shop on lease ${leaseId} for tenant ${lease.tenant.name}, status restored to ${newStatus}.`,
          actionType: "LEASE_UPDATE",
          oldValue: JSON.stringify({ status: lease.status }),
          newValue: JSON.stringify({ status: newStatus })
        }
      });
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/admin/units");
    revalidatePath("/admin/lockedout");
    revalidatePath("/manager/lockedout");
    revalidatePath("/admin/dashboard");
    revalidatePath("/manager/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Unseal Lease Error:", error);
    return { success: false, error: `Failed to unseal lease: ${error.message || error}` };
  }
}

