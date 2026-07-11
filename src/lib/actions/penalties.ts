"use server";

import { prisma } from "@/lib/prisma";
import { getArrearMonths, calcMonthPenalty } from "@/lib/arrears";

export async function getPendingPenalties(options?: { propertyIds?: string[]; take?: number }) {
  try {
    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });

    // 1. Fetch active leases with necessary relations
    const activeLeases = await prisma.lease.findMany({
      where: {
        status: { in: ["ACTIVE", "SEALED"] },
        ...(options?.propertyIds && options.propertyIds.length > 0 ? {
          unit: { propertyId: { in: options.propertyIds } }
        } : {})
      },
      include: {
        tenant: { select: { id: true, name: true, email: true, phoneNumber: true } },
        unit: { include: { property: true } },
        payments: true,
        penalties: true
      }
    });

    const pendingPenaltiesList: any[] = [];

    for (const lease of activeLeases) {
      const unit = lease.unit;
      const payments = lease.payments || [];
      const penalties = lease.penalties || [];

      // Sort pending/rejected payments
      const pendingPayments = payments
        .filter((p) => p.status === "PENDING" || p.status === "REJECTED")
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      const pendingDueDates = new Set(
        pendingPayments.map((p) => {
          const d = new Date(p.dueDate);
          return `${d.getFullYear()}-${d.getMonth()}`;
        })
      );

      // Fetch gap months from the arrears library
      const gapMonthDates = getArrearMonths(new Date(lease.startDate), payments);

      const dbPenaltyMap = new Map<string, any>();
      for (const p of penalties) {
        const d = new Date(p.dueDate);
        dbPenaltyMap.set(`${d.getFullYear()}-${d.getMonth()}`, p);
      }

      // Gather unrecorded (gap) penalties and pending/rejected payment penalties
      // 1. Pending/Rejected payments
      for (const p of pendingPayments) {
        const d = new Date(p.dueDate);
        const dbPenalty = dbPenaltyMap.get(`${d.getFullYear()}-${d.getMonth()}`);
        const { penalty } = calcMonthPenalty(new Date(p.dueDate), unit.rentAmount, settings, dbPenalty, unit.penaltyExempt, unit.property);
        
        if (penalty > 0) {
          pendingPenaltiesList.push({
            id: dbPenalty?.id || `dynamic-payment-penalty-${p.id}`,
            amount: penalty,
            dueDate: p.dueDate,
            status: dbPenalty?.status || "UNPAID",
            tenant: lease.tenant,
            lease: {
              id: lease.id,
              unit: {
                id: unit.id,
                unitNumber: unit.unitNumber,
                property: unit.property
              }
            }
          });
        }
      }

      // 2. Gap months
      for (const gd of gapMonthDates) {
        const monthKey = `${gd.getFullYear()}-${gd.getMonth()}`;
        if (pendingDueDates.has(monthKey)) continue;

        const dbPenalty = dbPenaltyMap.get(monthKey);
        const { penalty } = calcMonthPenalty(gd, unit.rentAmount, settings, dbPenalty, unit.penaltyExempt, unit.property);
        
        if (penalty > 0) {
          pendingPenaltiesList.push({
            id: dbPenalty?.id || `dynamic-gap-penalty-${lease.id}-${gd.getFullYear()}-${gd.getMonth()}`,
            amount: penalty,
            dueDate: gd,
            status: dbPenalty?.status || "UNPAID",
            tenant: lease.tenant,
            lease: {
              id: lease.id,
              unit: {
                id: unit.id,
                unitNumber: unit.unitNumber,
                property: unit.property
              }
            }
          });
        }
      }

      // 3. Database UNPAID/PARTIAL penalties that were not caught by pending/gap lists
      const handledMonths = new Set(
        pendingPenaltiesList.map((ap) => {
          const d = new Date(ap.dueDate);
          return `${d.getFullYear()}-${d.getMonth()}`;
        })
      );

      const unpaidDbPenalties = penalties.filter(
        (p) => p.status === "UNPAID" || p.status === "PARTIAL"
      );

      for (const dbPen of unpaidDbPenalties) {
        const d = new Date(dbPen.dueDate);
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
        if (!handledMonths.has(monthKey)) {
          pendingPenaltiesList.push({
            id: dbPen.id,
            amount: dbPen.amount - dbPen.paidAmount,
            dueDate: dbPen.dueDate,
            status: dbPen.status,
            tenant: lease.tenant,
            lease: {
              id: lease.id,
              unit: {
                id: unit.id,
                unitNumber: unit.unitNumber,
                property: unit.property
              }
            }
          });
        }
      }
    }

    // Sort penalties by dueDate descending (newest first)
    pendingPenaltiesList.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

    // Apply take limit if specified
    if (options?.take) {
      return pendingPenaltiesList.slice(0, options.take);
    }

    return pendingPenaltiesList;
  } catch (error) {
    console.error("Get Pending Penalties Error:", error);
    return [];
  }
}

/**
 * Fetch ALL recorded Penalty rows (any status) for the admin penalty management page.
 * Dynamic/computed penalties (not yet persisted) are NOT included here — this is
 * intentional: the management page deals with persisted records that can be waived.
 * 
 * For a combined view (including dynamic), the calling page can merge with
 * getPendingPenalties if needed.
 */
export async function getAllPenalties() {
  try {
    const penalties = await prisma.penalty.findMany({
      orderBy: { dueDate: "desc" },
      include: {
        tenant: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },
        lease: {
          include: {
            unit: {
              include: { property: true },
            },
          },
        },
      },
    });

    return penalties.map((p) => ({
      id: p.id,
      amount: p.status === "PAID" || p.status === "WAIVED" ? p.amount : (p.amount - p.paidAmount), // outstanding portion, or face value if paid/waived
      fullAmount: p.amount,
      paidAmount: p.paidAmount,
      dueDate: p.dueDate,
      status: p.status,
      tenant: p.tenant,
      lease: {
        id: p.leaseId,
        unit: {
          id: p.lease?.unit?.id ?? "",
          unitNumber: p.lease?.unit?.unitNumber ?? "—",
          property: {
            id: p.lease?.unit?.property?.id ?? "",
            name: p.lease?.unit?.property?.name ?? "—",
          },
        },
      },
    }));
  } catch (error) {
    console.error("Get All Penalties Error:", error);
    return [];
  }
}

export async function getCombinedPenalties() {
  try {
    const [dbPenalties, pendingPenalties] = await Promise.all([
      getAllPenalties(),
      getPendingPenalties(),
    ]);

    const combined = [...dbPenalties];
    const dbIds = new Set(dbPenalties.map((p) => p.id));

    for (const p of pendingPenalties) {
      if (p.id.startsWith("dynamic-") || !dbIds.has(p.id)) {
        combined.push({
          id: p.id,
          amount: p.amount,
          fullAmount: p.amount,
          paidAmount: 0,
          dueDate: p.dueDate,
          status: p.status,
          tenant: p.tenant,
          lease: p.lease,
        });
      }
    }

    // Sort by dueDate descending (newest first)
    combined.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    return combined;
  } catch (error) {
    console.error("Get Combined Penalties Error:", error);
    return [];
  }
}
