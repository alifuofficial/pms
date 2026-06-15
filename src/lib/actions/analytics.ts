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

    // Calculate expected rent based on active/rented leases in this month (excluding companyOwned)
    const activeLeases = await prisma.lease.findMany({
      where: {
        status: { in: ["ACTIVE", "EXPIRED", "TERMINATED"] },
        startDate: { lte: end },
        endDate: { gte: start },
        unit: {
          companyOwned: false,
          ...(propertyIds && propertyIds.length > 0 ? {
            propertyId: { in: propertyIds }
          } : {})
        }
      },
      include: {
        unit: {
          select: {
            rentAmount: true
          }
        }
      }
    });

    const filteredLeases = activeLeases.filter(lease => {
      // Exclude leases that were terminated before the start of the month
      if (lease.status === "TERMINATED" && lease.updatedAt < start) {
        return false;
      }
      return true;
    });

    const expected = filteredLeases.reduce((sum, lease) => sum + (lease.unit?.rentAmount || 0), 0);

    const collectedRent = await prisma.payment.aggregate({
      where: {
        status: "APPROVED",
        dueDate: { gte: start, lte: end },
        lease: {
          unit: {
            companyOwned: false,
            ...(propertyIds && propertyIds.length > 0 ? {
              propertyId: { in: propertyIds }
            } : {})
          }
        }
      },
      _sum: { amount: true },
    });

    const collected = collectedRent._sum.amount || 0;
    const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

    result.push({
      name: format(date, "MMM"),
      expected,
      collected,
      revenue: collected, // backwards compatibility
      rate
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

  return result;
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
