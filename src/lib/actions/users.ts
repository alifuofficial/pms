"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { hash } from "bcryptjs";

function normalizePhoneNumber(phone: string): string {
  if (!phone) return phone;
  let normalized = phone.replace(/\s+/g, ""); // Remove spaces
  
  if (normalized.startsWith("+251")) {
    normalized = normalized.substring(1); // Remove +
  } else if (normalized.startsWith("09") || normalized.startsWith("07")) {
    normalized = "251" + normalized.substring(1); // Replace leading 0 with 251
  }
  
  return normalized;
}

export async function createUser(data: {
  name: string;
  email: string;
  phoneNumber?: string;
  role: "ADMIN" | "MANAGER" | "ACCOUNTANT" | "TENANT";
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    const tempPassword = await hash("Soreti123!", 10);
    
    await prisma.user.create({
      data: {
        ...data,
        phoneNumber: data.phoneNumber ? normalizePhoneNumber(data.phoneNumber) : undefined,
        passwordHash: tempPassword,
      },
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
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    await prisma.user.update({
      where: { id },
      data: {
        ...data,
        phoneNumber: data.phoneNumber ? normalizePhoneNumber(data.phoneNumber) : undefined,
      },
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
  if (!session?.user || session.user.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  // Prevent self-deletion
  if (session.user.id === id) {
    return { success: false, error: "You cannot delete your own account." };
  }

  try {
    await prisma.user.delete({
      where: { id },
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
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
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
          dueDate: new Date(), // Initial payment is due now
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
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
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
          dueDate: new Date(),
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
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const updateData: any = {};
    if (data.password) {
      updateData.passwordHash = await hash(data.password, 10);
    }
    if (data.calendarType) {
      updateData.calendarType = data.calendarType;
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    revalidatePath("/", "layout"); // Revalidate entire app since calendar affects everywhere
    return { success: true };
  } catch (error) {
    console.error("Update Profile Error:", error);
    return { success: false, error: "Failed to update profile." };
  }
}
