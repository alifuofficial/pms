"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { hash } from "bcryptjs";
import { sendSMS } from "@/lib/sms";
import { normalizePhoneNumber } from "@/lib/phone";

/**
 * Defensively resolves the current user's ID and Role.
 * NextAuth sessions can sometimes omit custom token fields (like id and role) during refreshes.
 * If this happens, we resolve them securely from the database using the session's verified email.
 */
async function resolveSessionUser(session: any) {
  if (!session?.user) return null;
  
  let id = session.user.id;
  let role = session.user.role;
  const email = session.user.email;
  
  if ((!id || !role) && email) {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true }
    });
    if (dbUser) {
      id = dbUser.id;
      role = dbUser.role;
    }
  }
  
  return { id, role, email };
}

export async function createUser(data: {
  name: string;
  email: string;
  phoneNumber?: string;
  role: "ADMIN" | "MANAGER" | "ACCOUNTANT" | "TENANT";
}) {
  const session = await auth();
  const sessionUser = await resolveSessionUser(session);
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
    return { success: false, error: "Failed to create user." };
  }
}

export async function updateUser(id: string, data: {
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "ACCOUNTANT" | "TENANT";
  phoneNumber?: string;
  password?: string;
}) {
  const session = await auth();
  const sessionUser = await resolveSessionUser(session);
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
  } catch (error) {
    console.error("Update User Error:", error);
    return { success: false, error: "Failed to update user." };
  }
}

export async function deleteUser(id: string) {
  const session = await auth();
  const sessionUser = await resolveSessionUser(session);
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
  } catch (error) {
    console.error("Delete User Error:", error);
    return { success: false, error: "Failed to delete user." };
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
    receiptUrl: string;
  };
}) {
  const session = await auth();
  const sessionUser = await resolveSessionUser(session);
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
          receiptUrl: data.payment.receiptUrl,
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
    return { success: false, error: "Registration failed." };
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
    receiptUrl: string;
  };
}) {
  const session = await auth();
  const sessionUser = await resolveSessionUser(session);
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
          receiptUrl: data.payment.receiptUrl,
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
    return { success: false, error: "Failed to assign unit." };
  }
}

export async function updateUserProfile(data: {
  password?: string;
  calendarType?: string;
}) {
  const session = await auth();
  const sessionUser = await resolveSessionUser(session);
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
  } catch (error) {
    console.error("Update Profile Error:", error);
    return { success: false, error: "Failed to update profile." };
  }
}
