"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getLeaseUncollectedBalance } from "@/lib/arrears";

export async function getReportMetrics(startDate: Date, endDate: Date) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT")) {
    throw new Error("Unauthorized");
  }

  // 1. Revenue & Collection Rate (calculated using the monthly metrics)
  const monthlyMetrics = [];
  let currentMonthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endLimit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (currentMonthStart <= endLimit) {
    const start = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth(), 1);
    const end = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 0, 23, 59, 59, 999);

    const activeLeases = await prisma.lease.findMany({
      where: {
        status: { in: ["ACTIVE", "EXPIRED", "SEALED", "TERMINATED", "LOCKED_OUT"] },
        startDate: { lte: end },
        endDate: { gte: start },
        unit: {
          companyOwned: false
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
            companyOwned: false
          }
        }
      },
      _sum: { amount: true }
    });

    const collected = collectedRent._sum.amount || 0;
    const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

    monthlyMetrics.push({
      name: start.toLocaleString("default", { month: "short" }),
      expected,
      collected,
      rate
    });

    // Move to next month safely by modifying currentMonthStart
    currentMonthStart.setMonth(currentMonthStart.getMonth() + 1);
  }

  const expectedRevenue = monthlyMetrics.reduce((sum, m) => sum + m.expected, 0);
  const collectedRevenue = monthlyMetrics.reduce((sum, m) => sum + m.collected, 0);
  const collectionRate = expectedRevenue > 0 
    ? Math.round((collectedRevenue / expectedRevenue) * 100) 
    : 0;

  // 2. Tenant Move-ins (Leases starting in this period)
  const moveIns = await prisma.lease.count({
    where: {
      startDate: {
        gte: startDate,
        lte: endDate,
      },
      status: { in: ["ACTIVE", "PENDING"] }
    }
  });

  // 3. Tenant Move-outs (Leases ending in this period)
  const moveOuts = await prisma.lease.count({
    where: {
      endDate: {
        gte: startDate,
        lte: endDate,
      }
    }
  });

  // 4. Occupancy Rate (Current Snapshot)
  const totalUnits = await prisma.unit.count();
  const occupiedUnits = await prisma.unit.count({
    where: { status: "OCCUPIED" }
  });
  
  const occupancyRate = totalUnits > 0 
    ? Math.round((occupiedUnits / totalUnits) * 100) 
    : 0;

  // 5. Recent Activity (for table)
  const recentPayments = await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      }
    },
    include: {
      tenant: true,
      lease: {
        include: { unit: { include: { property: true } } }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  // 6. Advance Payments List
  const advancePaymentsRaw = await prisma.payment.findMany({
    where: {
      type: "ADVANCE",
      status: "APPROVED",
      paidAt: { gte: startDate, lte: endDate }
    },
    include: {
      tenant: { select: { name: true } },
      lease: { include: { unit: { include: { property: { select: { name: true } } } } } }
    },
    orderBy: { paidAt: "desc" }
  });

  const advancePayments = advancePaymentsRaw.map(p => ({
    id: p.id,
    tenantName: p.tenant.name,
    propertyName: p.lease.unit.property.name,
    unitNumber: p.lease.unit.unitNumber,
    amount: p.amount,
    date: p.paidAt,
    advanceUntil: p.advanceUntil
  }));

  // 7. Monthly Breakdown for the selected range (already calculated above)

  // Utility Revenue Aggregation
  const periodUtilities = await prisma.utilityBill.findMany({
    where: {
      dueDate: {
        gte: startDate,
        lte: endDate,
      }
    }
  });

  const expectedElectricity = periodUtilities
    .filter(b => b.type === "ELECTRICITY")
    .reduce((sum, b) => sum + b.amount, 0);

  const collectedElectricity = periodUtilities
    .filter(b => b.type === "ELECTRICITY" && b.status === "PAID")
    .reduce((sum, b) => sum + b.amount, 0);

  const expectedWater = periodUtilities
    .filter(b => b.type === "WATER")
    .reduce((sum, b) => sum + b.amount, 0);

  const collectedWater = periodUtilities
    .filter(b => b.type === "WATER" && b.status === "PAID")
    .reduce((sum, b) => sum + b.amount, 0);

  // 8. Tenants with Uncollected Balance due on or before endDate
  const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
  const allLeases = await prisma.lease.findMany({
    where: {
      status: { in: ["ACTIVE", "EXPIRED", "SEALED", "TERMINATED", "LOCKED_OUT"] },
      unit: { companyOwned: false }
    },
    include: {
      tenant: {
        select: { name: true, email: true }
      },
      unit: {
        include: {
          property: {
            select: { name: true }
          }
        }
      },
      payments: true,
      penalties: true,
      utilityBills: true,
      lockoutFees: true
    }
  });

  const uncollectedTenants = allLeases.map(lease => {
    const { rentUncollected, penaltiesUncollected, utilitiesUncollected, totalUncollected } = getLeaseUncollectedBalance(lease, settings, endDate);

    return {
      leaseId: lease.id,
      tenantName: lease.tenant.name,
      tenantEmail: lease.tenant.email || "",
      propertyName: lease.unit.property.name,
      unitNumber: lease.unit.unitNumber,
      rentUncollected,
      penaltiesUncollected,
      utilitiesUncollected,
      totalUncollected
    };
  }).filter(t => t.totalUncollected > 0)
    .sort((a, b) => b.totalUncollected - a.totalUncollected);

  return {
    collectedRevenue,
    expectedRevenue,
    collectionRate,
    moveIns,
    moveOuts,
    occupancyRate,
    totalUnits,
    occupiedUnits,
    recentPayments,
    advancePayments,
    monthlyMetrics,
    expectedElectricity,
    collectedElectricity,
    expectedWater,
    collectedWater,
    uncollectedTenants
  };
}
