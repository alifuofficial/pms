"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolveSessionUser } from "./auth-helper";

export async function getUsersWithPermissions() {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        canManageProperties: true,
        canManageUnits: true,
        canManageTenants: true,
        canManagePayments: true,
        canManageUtilities: true,
        canManageSettings: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, users };
  } catch (error: any) {
    console.error("Get Users Permissions Error:", error);
    return { success: false, error: error.message || "Failed to fetch users permissions" };
  }
}

export async function toggleUserPermission(
  userId: string,
  permissionField:
    | "canManageProperties"
    | "canManageUnits"
    | "canManageTenants"
    | "canManagePayments"
    | "canManageUtilities"
    | "canManageSettings",
  newValue: boolean
) {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    // Do not allow toggling settings permission on self if self is admin (prevents locking self out)
    if (sessionUser.id === userId && sessionUser.role === "ADMIN" && permissionField === "canManageSettings" && !newValue) {
      throw new Error("Cannot revoke settings management from yourself.");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        [permissionField]: newValue,
      },
    });

    // Create Audit Log
    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `Updated permission ${permissionField} to ${newValue} for user ${targetUser?.name || targetUser?.email || userId}`,
        actionType: "PERMISSION_UPDATE",
        metadata: JSON.stringify({ userId, permissionField, newValue }),
      },
    });

    revalidatePath("/admin/permission");
    return { success: true };
  } catch (error: any) {
    console.error("Toggle User Permission Error:", error);
    return { success: false, error: error.message || "Failed to update permission" };
  }
}
