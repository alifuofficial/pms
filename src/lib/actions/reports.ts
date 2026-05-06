"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function getReportMetrics(startDate: Date, endDate: Date) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT")) {
    throw new Error("Unauthorized");
  }

  // 1. Revenue & Collection Rate
  const periodPayments = await prisma.payment.findMany({
    where: {
      dueDate: {
        gte: startDate,
        lte: endDate,
      }
    }
  });

  const expectedRevenue = periodPayments.reduce((sum, p) => sum + p.amount, 0);
  const collectedRevenue = periodPayments
    .filter(p => p.status === "APPROVED")
    .reduce((sum, p) => sum + p.amount, 0);

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

  return {
    collectedRevenue,
    expectedRevenue,
    collectionRate,
    moveIns,
    moveOuts,
    occupancyRate,
    totalUnits,
    occupiedUnits,
    recentPayments
  };
}
