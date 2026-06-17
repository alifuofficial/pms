"use server";

import { prisma } from "@/lib/prisma";
import { startOfMonth, subMonths, format, endOfMonth } from "date-fns";
import { toEthiopian, getNowInAddisAbaba, getDaysInEthiopianMonth } from "@/lib/calendar";
import Kenat from "kenat";

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
        status: { in: ["ACTIVE", "EXPIRED", "TERMINATED", "LOCKED_OUT"] },
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
      const capDate = lease.terminatedAt || lease.updatedAt;
      if ((lease.status === "TERMINATED" || lease.status === "LOCKED_OUT") && capDate < start) {
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
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    // Filter units (excluding companyOwned)
    const unitWhere = {
      companyOwned: false,
      createdAt: { lte: end },
      ...(propertyIds && propertyIds.length > 0 ? { propertyId: { in: propertyIds } } : {})
    };

    let totalUnits = await prisma.unit.count({
      where: unitWhere
    });

    // Fallback if no units were created by that historical date (to avoid 0/0)
    if (totalUnits === 0) {
      totalUnits = await prisma.unit.count({
        where: {
          companyOwned: false,
          ...(propertyIds && propertyIds.length > 0 ? { propertyId: { in: propertyIds } } : {})
        }
      });
    }

    // Find leases that were active during this month
    const activeLeases = await prisma.lease.findMany({
      where: {
        status: { in: ["ACTIVE", "EXPIRED", "TERMINATED", "LOCKED_OUT"] },
        startDate: { lte: end },
        endDate: { gte: start },
        unit: {
          companyOwned: false,
          ...(propertyIds && propertyIds.length > 0 ? { propertyId: { in: propertyIds } } : {})
        }
      }
    });

    const filteredLeases = activeLeases.filter(lease => {
      const capDate = lease.terminatedAt || lease.updatedAt;
      if ((lease.status === "TERMINATED" || lease.status === "LOCKED_OUT") && capDate < start) {
        return false;
      }
      return true;
    });

    // Unique units that were occupied
    const occupiedUnitIds = new Set(filteredLeases.map(lease => lease.unitId));
    const occupiedUnits = occupiedUnitIds.size;

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

export async function getEthiopianRevenueAnalytics(months: number = 6, propertyIds?: string[]) {
  const result = [];
  const now = getNowInAddisAbaba();
  const nowEt = toEthiopian(now);
  const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });

  for (let i = months - 1; i >= 0; i--) {
    let etYear = nowEt.year;
    let etMonth = nowEt.month - i;
    while (etMonth <= 0) {
      etMonth += 13;
      etYear--;
    }

    const startEtObj = new Kenat({ year: etYear, month: etMonth, day: 1 });
    const gregStart = startEtObj.getGregorian();
    const startDate = new Date(gregStart.year, gregStart.month - 1, gregStart.day, 0, 0, 0);

    const maxDays = getDaysInEthiopianMonth(etYear, etMonth);
    const endEtObj = new Kenat({ year: etYear, month: etMonth, day: maxDays });
    const gregEnd = endEtObj.getGregorian();
    const endDate = new Date(gregEnd.year, gregEnd.month - 1, gregEnd.day, 23, 59, 59);

    const activeLeases = await prisma.lease.findMany({
      where: {
        status: { in: ["ACTIVE", "EXPIRED", "TERMINATED", "LOCKED_OUT"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        unit: {
          companyOwned: false,
          ...(propertyIds && propertyIds.length > 0 ? {
            propertyId: { in: propertyIds }
          } : {})
        }
      },
      include: {
        unit: true,
        payments: true
      }
    });

    const filteredLeases = activeLeases.filter(lease => {
      const capDate = lease.terminatedAt || lease.updatedAt;
      if ((lease.status === "TERMINATED" || lease.status === "LOCKED_OUT") && capDate < startDate) {
        return false;
      }
      return true;
    });

    const expected = filteredLeases.reduce((sum, lease) => sum + lease.unit.rentAmount, 0);

    let collected = 0;
    for (const lease of filteredLeases) {
      const approvedMonthPayments = lease.payments.filter((p: any) => 
        p.status === "APPROVED" &&
        new Date(p.dueDate) >= startDate &&
        new Date(p.dueDate) <= endDate
      );
      collected += approvedMonthPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    }

    const uncollected = Math.max(0, expected - collected);
    const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

    const ET_MONTHS = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"];
    const monthName = ET_MONTHS[etMonth - 1];

    result.push({
      name: monthName,
      expected,
      collected,
      uncollected,
      rate
    });
  }

  return result;
}
