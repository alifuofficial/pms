"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function createProperty(data: {
  name: string;
  address: string;
  type: "RESIDENTIAL" | "COMMERCIAL" | "BOTH";
  managerId: string;
  accountantId?: string;
}) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    await prisma.property.create({
      data,
    });
    revalidatePath("/admin/properties");
    revalidatePath("/manager/properties");
    return { success: true };
  } catch (error) {
    console.error("Create Property Error:", error);
    return { success: false, error: "Failed to create property" };
  }
}

export async function updateProperty(id: string, data: {
  name: string;
  address: string;
  type: "RESIDENTIAL" | "COMMERCIAL" | "BOTH";
  managerId: string;
  accountantId?: string;
}) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    await prisma.property.update({
      where: { id },
      data,
    });
    revalidatePath("/admin/properties");
    revalidatePath("/manager/properties");
    return { success: true };
  } catch (error) {
    console.error("Update Property Error:", error);
    return { success: false, error: "Failed to update property" };
  }
}

export async function deleteProperty(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    // Delete related units first or use cascade
    // In schema.prisma, units relate to property. If cascade is not set, we do it manually.
    await prisma.property.delete({
      where: { id },
    });
    revalidatePath("/admin/properties");
    revalidatePath("/manager/properties");
    return { success: true };
  } catch (error) {
    console.error("Delete Property Error:", error);
    return { success: false, error: "Failed to delete property" };
  }
}

export async function createUnit(propertyId: string, data: {
  unitNumber: string;
  floor: number;
  size: number;
  type: string;
  rentAmount: number;
}) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const existing = await prisma.unit.findFirst({
      where: {
        propertyId,
        unitNumber: data.unitNumber
      }
    });

    if (existing) {
      return { success: false, error: `Unit ${data.unitNumber} already exists in this property.` };
    }

    // Generate secure, unique qrSlug
    let qrSlug = "";
    let attempts = 0;
    while (attempts < 10) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let tempSlug = "";
      for (let i = 0; i < 10; i++) {
        tempSlug += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const duplicate = await prisma.unit.findUnique({ where: { qrSlug: tempSlug } });
      if (!duplicate) {
        qrSlug = tempSlug;
        break;
      }
      attempts++;
    }

    await prisma.unit.create({
      data: {
        ...data,
        propertyId,
        qrSlug: qrSlug || null,
      },
    });
    revalidatePath("/admin/properties");
    revalidatePath("/manager/properties");
    revalidatePath("/admin/units");
    return { success: true };
  } catch (error) {
    console.error("Create Unit Error:", error);
    return { success: false, error: "Failed to create unit" };
  }
}

export async function updateUnit(id: string, data: {
  unitNumber: string;
  floor: number;
  size: number;
  type: string;
  rentAmount: number;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
}) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const current = await prisma.unit.findUnique({ where: { id } });
    if (!current) return { success: false, error: "Unit not found" };

    if (data.unitNumber !== current.unitNumber) {
      const existing = await prisma.unit.findFirst({
        where: {
          propertyId: current.propertyId,
          unitNumber: data.unitNumber
        }
      });

      if (existing) {
        return { success: false, error: `Unit ${data.unitNumber} already exists in this property.` };
      }
    }

    await prisma.unit.update({
      where: { id },
      data,
    });
    revalidatePath("/admin/properties");
    revalidatePath("/manager/properties");
    revalidatePath("/admin/units");
    return { success: true };
  } catch (error) {
    console.error("Update Unit Error:", error);
    return { success: false, error: "Failed to update unit" };
  }
}

export async function bulkUpdateUnits(ids: string[], data: {
  floor?: number;
  status?: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
  type?: string;
  rentAmount?: number;
  qrPrinted?: boolean;
}) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (ids.length === 0) return { success: false, error: "No units selected" };

  try {
    await prisma.unit.updateMany({
      where: { id: { in: ids } },
      data,
    });
    revalidatePath("/admin/units");
    revalidatePath("/manager/units");
    revalidatePath("/admin/properties");
    return { success: true, count: ids.length };
  } catch (error) {
    console.error("Bulk Update Units Error:", error);
    return { success: false, error: "Bulk update failed" };
  }
}

export async function deleteUnit(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    await prisma.unit.delete({
      where: { id },
    });
    revalidatePath("/admin/properties");
    revalidatePath("/manager/properties");
    revalidatePath("/admin/units");
    return { success: true };
  } catch (error) {
    console.error("Delete Unit Error:", error);
    return { success: false, error: "Failed to delete unit" };
  }
}

export async function getProperties() {
  return await prisma.property.findMany({
    select: { id: true, name: true },
  });
}

export async function getManagers() {
  return await prisma.user.findMany({
    where: { role: "MANAGER" },
    select: { id: true, name: true },
  });
}

export async function getAccountants() {
  return await prisma.user.findMany({
    where: { role: "ACCOUNTANT" },
    select: { id: true, name: true },
  });
}
export async function getAvailableUnits() {
  return await prisma.unit.findMany({
    where: { status: "AVAILABLE" },
    include: { property: true },
    orderBy: { property: { name: "asc" } },
  });
}

export async function assignUserToProperties(userId: string, role: string, propertyIds: string[]) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    if (role === "MANAGER") {
      await prisma.property.updateMany({
        where: { id: { in: propertyIds } },
        data: { managerId: userId }
      });
    } else if (role === "ACCOUNTANT") {
      // For accountants, we can also clear previous ones if they are not in the list
      // But let's keep it simple: just assign to the selected ones.
      await prisma.property.updateMany({
        where: { id: { in: propertyIds } },
        data: { accountantId: userId }
      });
    }
    
    revalidatePath("/admin/users");
    revalidatePath("/admin/properties");
    return { success: true };
  } catch (error) {
    console.error("Assign Properties Error:", error);
    return { success: false, error: "Failed to assign properties" };
  }
}

export async function vacateUnit(unitId: string) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.$transaction([
      // 1. Terminate any active leases
      prisma.lease.updateMany({
        where: { unitId, status: "ACTIVE" },
        data: { status: "TERMINATED" }
      }),
      // 2. Set unit to AVAILABLE
      prisma.unit.update({
        where: { id: unitId },
        data: { status: "AVAILABLE" }
      })
    ]);

    revalidatePath("/admin/units");
    revalidatePath("/admin/properties");
    revalidatePath("/manager/units");
    return { success: true };
  } catch (error) {
    console.error("Vacate Unit Error:", error);
    return { success: false, error: "Failed to vacate unit." };
  }
}
