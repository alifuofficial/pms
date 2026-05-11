"use server";

import { prisma } from "@/lib/prisma";
import { startOfMonth, subMonths, format, endOfMonth } from "date-fns";

export async function getRevenueAnalytics(months: number = 6, propertyIds?: string[]) {
  const result = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const rentRevenue = await prisma.payment.aggregate({
      where: {
        status: "APPROVED",
        paidAt: { gte: start, lte: end },
        ...(propertyIds && propertyIds.length > 0 ? {
          lease: { unit: { propertyId: { in: propertyIds } } }
        } : {})
      },
      _sum: { amount: true },
    });

    const penaltyRevenue = await prisma.penalty.aggregate({
      where: {
        status: "PAID",
        paidAt: { gte: start, lte: end },
        ...(propertyIds && propertyIds.length > 0 ? {
          lease: { unit: { propertyId: { in: propertyIds } } }
        } : {})
      },
      _sum: { paidAmount: true },
    });

    result.push({
      name: format(date, "MMM"),
      revenue: (rentRevenue._sum.amount || 0) + (penaltyRevenue._sum.paidAmount || 0),
    });
  }

  return result;
}

export async function getOccupancyAnalytics(months: number = 6, propertyIds?: string[]) {
  const result = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i);
    
    const unitWhere = propertyIds && propertyIds.length > 0 
      ? { propertyId: { in: propertyIds } }
      : {};

    const totalUnits = await prisma.unit.count({
      where: unitWhere
    });
    
    const occupiedUnits = await prisma.unit.count({
      where: {
        ...unitWhere,
        status: "OCCUPIED",
      },
    });

    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    result.push({
      name: format(date, "MMM"),
      occupancy: occupancyRate,
    });
  }

  return result;
}

export async function getRecentAuditLogs(limit: number = 5) {
  return await prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });
}

export async function getTenantRevenueAnalytics(tenantId: string, months: number = 6) {
  const result = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const revenue = await prisma.payment.aggregate({
      where: {
        tenantId,
        status: "APPROVED",
        paidAt: {
          gte: start,
          lte: end,
        },
      },
      _sum: { amount: true },
    });

    result.push({
      name: format(date, "MMM"),
      revenue: revenue._sum.amount || 0,
    });
  }

}

export async function getPaymentTypeBreakdown(propertyIds?: string[]) {
  const propertyWhere = propertyIds && propertyIds.length > 0 
    ? { lease: { unit: { propertyId: { in: propertyIds } } } }
    : {};

  const monthlyCount = await prisma.payment.count({
    where: { 
      ...propertyWhere,
      type: "MONTHLY",
      status: "APPROVED" 
    }
  });

  const advanceCount = await prisma.payment.count({
    where: { 
      ...propertyWhere,
      type: "ADVANCE",
      status: "APPROVED" 
    }
  });

  const penaltyCount = await prisma.penalty.count({
    where: { 
      ...(propertyIds && propertyIds.length > 0 ? {
        lease: { unit: { propertyId: { in: propertyIds } } }
      } : {}),
      status: "PAID" 
    }
  });

  return [
    { name: "Monthly Rent", value: monthlyCount, color: "#2563eb" },
    { name: "Advance Payments", value: advanceCount, color: "#8b5cf6" },
    { name: "Penalties", value: penaltyCount, color: "#f59e0b" },
  ];
}
