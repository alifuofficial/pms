"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function generateSlug(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function generateUnitQrSlug(unitId: string) {
  try {
    // Check if it already has one
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (unit?.qrSlug) return { success: true, slug: unit.qrSlug };

    const slug = generateSlug();
    await prisma.unit.update({
      where: { id: unitId },
      data: { qrSlug: slug },
    });
    revalidatePath("/admin/units");
    return { success: true, slug };
  } catch (error) {
    console.error("QR Generation Error:", error);
    return { success: false, error: "Failed to generate QR slug." };
  }
}

export async function getPublicUnitStatus(slug: string) {
  try {
    const unit = await prisma.unit.findUnique({
      where: { qrSlug: slug },
      include: {
        property: true,
        leases: {
          where: { status: "ACTIVE" },
          include: {
            payments: {
              orderBy: { dueDate: "desc" },
              take: 1
            }
          }
        }
      }
    });

    if (!unit) return { success: false, error: "Unit not found." };

    const activeLease = unit.leases[0];
    const latestPayment = activeLease?.payments[0];

    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    const bankAccounts = await prisma.bankAccount.findMany();

    return {
      success: true,
      unit: {
        id: unit.id,
        unitNumber: unit.unitNumber,
        property: unit.property.name,
        size: unit.size,
        type: unit.type,
        rentAmount: unit.rentAmount
      },
      lease: activeLease ? {
        id: activeLease.id,
        endDate: activeLease.endDate,
        latestPayment: latestPayment ? {
          id: latestPayment.id,
          amount: latestPayment.amount,
          dueDate: latestPayment.dueDate,
          status: latestPayment.status,
          paidAt: latestPayment.paidAt
        } : null
      } : null,
      settings: {
        currency: settings?.currency || "USD",
        bankAccounts
      }
    };
  } catch (error) {
    console.error("Fetch Public Unit Error:", error);
    return { success: false, error: "Failed to load unit status." };
  }
}
