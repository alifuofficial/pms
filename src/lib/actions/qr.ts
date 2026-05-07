"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function generateSlug(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous characters O, 0, I, 1
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
    if (!unit) return { success: false, error: "Unit not found." };
    if (unit.qrSlug) return { success: true, slug: unit.qrSlug };

    let slug = "";
    let attempts = 0;
    while (attempts < 5) {
      slug = generateSlug();
      try {
        await prisma.unit.update({
          where: { id: unitId },
          data: { qrSlug: slug },
        });
        break;
      } catch (e: any) {
        if (e.code === 'P2002') { // Unique constraint failed
          attempts++;
          continue;
        }
        throw e;
      }
    }

    if (attempts === 5) return { success: false, error: "Failed to generate unique slug." };

    revalidatePath("/admin/units", "page");
    revalidatePath("/(portal)/admin/units", "page");
    return { success: true, slug };
  } catch (error: any) {
    console.error("Generate QR Slug Error:", error);
    return { success: false, error: error.message || "Failed to generate gateway slug." };
  }
}

export async function getPublicUnitStatus(slug: string) {
  try {
    const unit = await prisma.unit.findUnique({
      where: { qrSlug: slug },
      include: {
        property: true,
        leases: {
          orderBy: { createdAt: "desc" },
          include: {
            tenant: {
              select: { name: true }
            },
            payments: {
              orderBy: { dueDate: "desc" },
              take: 5
            }
          }
        }
      }
    });

    if (!unit) return { success: false, error: "Unit not found." };

    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    const bankAccounts = await prisma.bankAccount.findMany({ orderBy: { createdAt: "desc" } });

    // Prefer ACTIVE lease, otherwise take the latest one
    const activeLease = unit.leases.find(l => l.status === "ACTIVE") || unit.leases[0];
    
    const payments = activeLease?.payments || [];
    const latestApprovedPayment = payments.find(p => p.status === "APPROVED");
    const nextDuePayment = payments.find(p => p.status === "PENDING" || p.status === "REJECTED");
    
    const nextPayment = nextDuePayment || (latestApprovedPayment ? {
      id: "estimated",
      amount: unit.rentAmount,
      dueDate: latestApprovedPayment.type === "ADVANCE" && latestApprovedPayment.advanceUntil 
        ? new Date(latestApprovedPayment.advanceUntil)
        : new Date(new Date(latestApprovedPayment.dueDate).setMonth(new Date(latestApprovedPayment.dueDate).getMonth() + 1)),
      status: "ESTIMATED"
    } as any : null);

    let penalty = 0;
    let penaltyTier = 0;
    if (nextPayment && settings?.lateFeeEnabled) {
      const now = new Date();
      const dueDate = new Date(nextPayment.dueDate);
      const diffTime = now.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 12) {
        penaltyTier = 2;
        penalty = unit.rentAmount * 0.10; // 10% penalty
      } else if (diffDays > 5) {
        penaltyTier = 1;
        penalty = unit.rentAmount * ((settings.lateFeePercentage || 5) / 100);
      }
    }

    return {
      success: true,
      unit: {
        id: unit.id,
        unitNumber: unit.unitNumber,
        property: unit.property.name,
        size: unit.size,
        type: unit.type,
        rentAmount: unit.rentAmount,
        status: unit.status
      },
      lease: activeLease ? {
        id: activeLease.id,
        status: activeLease.status,
        tenantName: activeLease.tenant.name,
        endDate: activeLease.endDate,
        latestApprovedPayment: latestApprovedPayment ? {
          id: latestApprovedPayment.id,
          amount: latestApprovedPayment.amount,
          dueDate: latestApprovedPayment.dueDate,
          type: latestApprovedPayment.type,
          advanceUntil: latestApprovedPayment.advanceUntil,
          status: latestApprovedPayment.status,
          paidAt: latestApprovedPayment.paidAt
        } : null,
        nextDuePayment: nextPayment ? {
          ...nextPayment,
          id: nextPayment.id,
          amount: nextPayment.amount,
          dueDate: nextPayment.dueDate,
          type: nextPayment.type,
          advanceUntil: nextPayment.advanceUntil,
          status: nextPayment.status,
          penalty: penalty,
          totalAmount: nextPayment.amount + penalty,
          penaltyTier
        } : null
      } : null,
      settings: {
        currency: settings?.currency || "USD",
        bankAccounts,
        lateFeeEnabled: settings?.lateFeeEnabled
      }
    };
  } catch (error) {
    console.error("Fetch Public Unit Error:", error);
    return { success: false, error: "Failed to load unit status." };
  }
}
