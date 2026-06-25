"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolveSessionUser } from "./auth-helper";
import { addEthiopianMonths, toEthiopian, getDaysPastEthiopianExpiry, getEthiopianMonthEnd, hasLatePenalty, getDaysInEthiopianMonth } from "@/lib/calendar";
import Kenat from "kenat";

function getLeaseArrearMonths(leaseStart: Date, approvedPayments: any[]): Date[] {
  const now = new Date();
  const arrears: Date[] = [];
  const coveredMonthKeys = new Set<string>();
  
  for (const p of approvedPayments) {
    let startEt = toEthiopian(new Date(p.dueDate));
    const endEt = toEthiopian(p.advanceUntil ? new Date(p.advanceUntil) : new Date(p.dueDate));
    
    if (p.advanceUntil) {
      if (startEt.year > endEt.year || (startEt.year === endEt.year && startEt.month > endEt.month)) {
        startEt = endEt;
      }
    }
    
    let tempYear = startEt.year;
    let tempMonth = startEt.month;
    let iterations = 0;
    while (iterations < 60) {
      coveredMonthKeys.add(`${tempYear}-${tempMonth}`);
      if (tempYear === endEt.year && tempMonth === endEt.month) break;
      tempMonth++;
      if (tempMonth > 13) { tempMonth = 1; tempYear++; }
      iterations++;
    }
  }

  const startEt = toEthiopian(leaseStart);
  const nowEt = toEthiopian(now);

  let tempYear = startEt.year;
  let tempMonth = startEt.month;
  
  // Skip the starting month if the lease starts on the last day of the Ethiopian month
  const maxDays = getDaysInEthiopianMonth(tempYear, tempMonth);
  if (startEt.day === maxDays) {
    tempMonth++;
    if (tempMonth > 13) {
      tempMonth = 1;
      tempYear++;
    }
  }

  let iterations = 0;
  
  while (iterations < 60) {
    const key = `${tempYear}-${tempMonth}`;
    
    if (!coveredMonthKeys.has(key)) {
      const etDateObj = new Kenat({ year: tempYear, month: tempMonth, day: 1 });
      const greg = etDateObj.getGregorian() as any;
      arrears.push(new Date(Date.UTC(greg.year, greg.month - 1, greg.day, 12, 0, 0)));
    }
    
    if (tempYear === nowEt.year && tempMonth === nowEt.month) break;
    tempMonth++;
    if (tempMonth > 13) { tempMonth = 1; tempYear++; }
    iterations++;
  }

  return arrears;
}

async function getMergedGroupLeases(leaseId: string, tenantId: string, tx: any) {
  const lease = await tx.lease.findUnique({
    where: { id: leaseId },
    include: { unit: true }
  });
  if (!lease) return [];

  const parentUnitId = lease.unit.mergedIntoId || lease.unit.id;
  const groupUnits = await tx.unit.findMany({
    where: {
      OR: [
        { id: parentUnitId },
        { mergedIntoId: parentUnitId }
      ]
    }
  });

  const groupLeases = await tx.lease.findMany({
    where: {
      tenantId: tenantId,
      unitId: { in: groupUnits.map((u: any) => u.id) },
      status: { in: ["ACTIVE", "PENDING", "SEALED"] }
    },
    include: {
      unit: true,
      penalties: { orderBy: { dueDate: "asc" } }
    }
  });

  return groupLeases;
}

export async function approvePayment(
  paymentId: string, 
  penaltyAmountReceived?: number,
  actualAmountReceived?: number
) {
  try {
  const sessionUser = await resolveSessionUser();
  if (!sessionUser || (sessionUser.role !== "ACCOUNTANT" && sessionUser.role !== "ADMIN")) {
    return { success: false, error: "Unauthorized" };
  }

    const currentPayment = await prisma.payment.findUnique({ 
      where: { id: paymentId },
      include: { 
        lease: { 
          include: { 
            unit: true,
            penalties: { orderBy: { dueDate: "asc" } }
          } 
        } 
      }
    });
    if (!currentPayment) return { success: false, error: "Payment not found" };

    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    const finalAmount = actualAmountReceived !== undefined ? actualAmountReceived : currentPayment.amount;

    // Retrieve active merged group leases
    const groupLeases = await getMergedGroupLeases(currentPayment.leaseId, currentPayment.tenantId, prisma);
    
    if (groupLeases.length > 1) {
      // ── MERGED GROUP PAYMENT APPROVAL ──────────────────────────────────────
      const totalGroupRent = groupLeases.reduce((sum: number, l: any) => sum + l.unit.rentAmount, 0) || 1;
      
      // Calculate share for each lease
      let totalAssigned = 0;
      const leaseShares = new Map<string, number>();
      for (let i = 0; i < groupLeases.length; i++) {
        const l = groupLeases[i];
        if (i === groupLeases.length - 1) {
          leaseShares.set(l.id, Math.max(0, Math.round((finalAmount - totalAssigned) * 100) / 100));
        } else {
          const share = Math.round((finalAmount * (l.unit.rentAmount / totalGroupRent)) * 100) / 100;
          leaseShares.set(l.id, share);
          totalAssigned += share;
        }
      }

      await prisma.$transaction(async (tx) => {
        // 1. Process primary payment record
        const primaryShare = leaseShares.get(currentPayment.leaseId) || 0;
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: "APPROVED",
            amount: primaryShare,
            approvedBy: sessionUser.id,
            paidAt: new Date()
          }
        });

        // 2. Process secondary leases
        for (const l of groupLeases) {
          if (l.id === currentPayment.leaseId) continue;
          
          const lShare = leaseShares.get(l.id) || 0;
          // Check if there is already a PENDING payment for this lease on the same dueDate
          const existingPending = await tx.payment.findFirst({
            where: {
              leaseId: l.id,
              status: "PENDING"
            }
          });

          if (existingPending) {
            await tx.payment.update({
              where: { id: existingPending.id },
              data: {
                status: "APPROVED",
                amount: lShare,
                approvedBy: sessionUser.id,
                paidAt: new Date(),
                receiptUrl: currentPayment.receiptUrl,
                senderName: currentPayment.senderName,
                transactionId: currentPayment.transactionId ? `${currentPayment.transactionId}_ref_${currentPayment.id}` : `ref_${currentPayment.id}`
              }
            });
          } else {
            await tx.payment.create({
              data: {
                leaseId: l.id,
                tenantId: currentPayment.tenantId,
                amount: lShare,
                dueDate: currentPayment.dueDate,
                status: "APPROVED",
                type: currentPayment.type,
                approvedBy: sessionUser.id,
                paidAt: new Date(),
                receiptUrl: currentPayment.receiptUrl,
                senderName: currentPayment.senderName,
                transactionId: currentPayment.transactionId ? `${currentPayment.transactionId}_ref_${currentPayment.id}` : `ref_${currentPayment.id}`
              }
            });
          }
        }

        // 3. Mark units as OCCUPIED and leases as ACTIVE (if not sealed)
        for (const l of groupLeases) {
          await tx.unit.update({
            where: { id: l.unitId },
            data: { status: "OCCUPIED" }
          });
          
          await tx.lease.update({
            where: { id: l.id },
            data: { status: l.status === "SEALED" ? "SEALED" : "ACTIVE" }
          });
        }

        // 4. Recalculate lease state chronologically for all leases in the group
        for (const l of groupLeases) {
          await recalculateLeaseStateInternal(l.id, tx);
        }

        // 5. Create Audit Logs
        for (const l of groupLeases) {
          const lShare = leaseShares.get(l.id) || 0;
          await tx.auditLog.create({
            data: {
              userId: sessionUser.id,
              action: `Approved group payment share of ${lShare} for Unit ${l.unit.unitNumber}. (Primary payment: ${paymentId})`,
              actionType: "PAYMENT_APPROVAL",
              oldValue: JSON.stringify({ status: "PENDING" }),
              newValue: JSON.stringify({ status: "APPROVED", amount: lShare }),
              metadata: JSON.stringify({ paymentId, leaseId: l.id, amount: lShare })
            }
          });
        }
      });
      
      // Post-approval revalidations and SMS
      try {
        const lease = await prisma.lease.findUnique({ 
          where: { id: currentPayment.leaseId },
          include: { unit: true, tenant: true }
        });
        
        // SMS combined approval message
        if (lease?.tenant?.phoneNumber) {
          const { sendSMS } = await import("@/lib/sms");
          await sendSMS(lease.tenant.phoneNumber, "payment-approved", {
            tenant_name: lease.tenant.name || "Tenant",
            unit_number: lease.unit.unitNumber || "N/A",
            amount: finalAmount.toLocaleString()
          });
        }
      } catch (notificationError) {
        console.error("Post-approval notification error (non-fatal):", notificationError);
      }

      revalidatePath("/admin/payments");
      revalidatePath("/admin/tenants");
      revalidatePath("/accountant/payments");
      revalidatePath("/accountant/dashboard");
      revalidatePath("/admin/dashboard");
      revalidatePath("/", "layout");
      
      return { success: true };
    }

    const monthlyRent = currentPayment.lease.unit.rentAmount;
    
    // Fetch all approved payments for this lease so we can calculate arrears
    const approvedPayments = await prisma.payment.findMany({
      where: { leaseId: currentPayment.leaseId, status: "APPROVED" }
    });

    const gapMonths = getLeaseArrearMonths(new Date(currentPayment.lease.startDate), approvedPayments);
    gapMonths.sort((a, b) => a.getTime() - b.getTime());

    let fundsRemaining = finalAmount + currentPayment.lease.advanceBalance;
    let actualPenaltyPaid = 0;
    let monthsCovered = 0;
    
    const finalizedPenaltiesToCreate: any[] = [];
    const finalizedPenaltiesToUpdate: any[] = [];
    
    // Fetch existing database penalties that are UNPAID for this lease
    const unpaidDbPenalties = currentPayment.lease.penalties || [];
    
    const dbPenaltyMap = new Map<string, any>();
    for (const p of unpaidDbPenalties) {
      const d = new Date(p.dueDate);
      dbPenaltyMap.set(`${d.getFullYear()}-${d.getMonth()}`, p);
    }

    let clearedAllArrears = true;
    for (const gd of gapMonths) {
      if (fundsRemaining >= monthlyRent) {
        fundsRemaining -= monthlyRent;
        monthsCovered++;
      } else {
        clearedAllArrears = false;
        break;
      }
    }
    
    if (clearedAllArrears && fundsRemaining >= monthlyRent) {
      const extraMonths = Math.floor(fundsRemaining / monthlyRent);
      monthsCovered += extraMonths;
      fundsRemaining = fundsRemaining % monthlyRent;
    }

    const coveredMonthsList = gapMonths.slice(0, monthsCovered);
    for (const gd of coveredMonthsList) {
      const leaseStartDate = new Date(currentPayment.lease.startDate);
      const startEt = toEthiopian(leaseStartDate);
      const gdEt = toEthiopian(gd);
      const isStartMonth = gdEt.year === startEt.year && gdEt.month === startEt.month;
      
      const hasPenalty = !currentPayment.lease.unit.penaltyExempt && hasLatePenalty(gd, settings) && !(isStartMonth && approvedPayments.length === 0);
      const penaltyAmount = hasPenalty ? (monthlyRent * ((settings?.lateFeePercentage || 5) / 100)) : 0;
      
      if (penaltyAmount <= 0) continue;

      const monthKey = `${gd.getFullYear()}-${gd.getMonth()}`;
      const dbPenalty = dbPenaltyMap.get(monthKey);
      
      let currentPenaltyOwed = penaltyAmount;
      if (dbPenalty) {
        if (dbPenalty.status === "WAIVED") {
          continue;
        } else {
          currentPenaltyOwed = dbPenalty.amount - dbPenalty.paidAmount;
        }
      }
      
      if (currentPenaltyOwed > 0) {
        const toPay = Math.min(currentPenaltyOwed, fundsRemaining);
        if (toPay > 0) {
          actualPenaltyPaid += toPay;
          fundsRemaining -= toPay;
        }
        
        if (dbPenalty) {
          if (toPay > 0) {
            finalizedPenaltiesToUpdate.push({
              id: dbPenalty.id,
              paidAmount: dbPenalty.paidAmount + toPay,
              status: (dbPenalty.paidAmount + toPay) >= dbPenalty.amount ? "PAID" : "PARTIAL"
            });
          }
        } else {
          finalizedPenaltiesToCreate.push({
            amount: penaltyAmount,
            paidAmount: toPay,
            status: toPay >= penaltyAmount ? "PAID" : toPay > 0 ? "PARTIAL" : "UNPAID",
            dueDate: gd
          });
        }
      }
    }
    
    const newAdvanceBalance = fundsRemaining;
    
    // Unified chronological coverage end calculation
    let currentCoverageEnd: Date;
    if (approvedPayments.length > 0) {
      const sortedApproved = approvedPayments.map(p => ({
        coverageEnd: getEthiopianMonthEnd(new Date(p.advanceUntil || p.dueDate))
      })).sort((a, b) => b.coverageEnd.getTime() - a.coverageEnd.getTime());
      
      currentCoverageEnd = sortedApproved[0].coverageEnd;
    } else {
      // If no approved payments, start one month before lease.startDate unless skipped
      const startEt = toEthiopian(new Date(currentPayment.lease.startDate));
      const maxDays = getDaysInEthiopianMonth(startEt.year, startEt.month);
      if (startEt.day === maxDays) {
        currentCoverageEnd = new Date(currentPayment.lease.startDate);
      } else {
        currentCoverageEnd = addEthiopianMonths(new Date(currentPayment.lease.startDate), -1);
      }
    }

    let finalAdvanceUntil = currentCoverageEnd;
    if (monthsCovered > 0) {
      finalAdvanceUntil = addEthiopianMonths(new Date(currentCoverageEnd), monthsCovered);
    }

    // ── Execute Transaction ────────────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      // 1. Update Payment Status
      await tx.payment.update({
        where: { id: paymentId },
        data: { 
          status: "APPROVED",
          amount: finalAmount,
          penalty: actualPenaltyPaid,
          advanceUntil: finalAdvanceUntil,
          paidAt: new Date(),
          approver: { connect: { id: sessionUser.id } },
        },
      });

      // 2. Settle Penalties
      for (const pToCreate of finalizedPenaltiesToCreate) {
        await tx.penalty.create({
          data: {
            leaseId: currentPayment.leaseId,
            tenantId: currentPayment.tenantId,
            amount: pToCreate.amount,
            paidAmount: pToCreate.paidAmount,
            status: pToCreate.status,
            dueDate: pToCreate.dueDate,
            paidAt: new Date()
          }
        });
      }

      for (const pToUpdate of finalizedPenaltiesToUpdate) {
        await tx.penalty.update({
          where: { id: pToUpdate.id },
          data: {
            paidAmount: pToUpdate.paidAmount,
            status: pToUpdate.status,
            paidAt: new Date()
          }
        });
      }

      // 3. Handle Advance Balance & Coverage Extension
      await tx.lease.update({
        where: { id: currentPayment.leaseId },
        data: { 
          advanceBalance: newAdvanceBalance,
          status: "ACTIVE"
        }
      });

      // Update Unit status if it was vacant
      await tx.unit.update({
        where: { id: currentPayment.lease.unitId },
        data: { status: "OCCUPIED" }
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Approved payment of ${finalAmount} (penalty: ${actualPenaltyPaid}, rent: ${finalAmount - actualPenaltyPaid}). New balance: ${newAdvanceBalance}`,
          actionType: "PAYMENT_APPROVAL",
          oldValue: JSON.stringify({ status: "PENDING", advanceBalance: currentPayment.lease.advanceBalance }),
          newValue: JSON.stringify({ status: "APPROVED", advanceBalance: newAdvanceBalance }),
          metadata: JSON.stringify({ paymentId, amount: finalAmount, actualPenaltyPaid, newAdvanceBalance })
        }
      });
    });

    // ── STEP 5: Final Revalidation & Notifications ─────────────────────────
    try {
      const lease = await prisma.lease.findUnique({ 
        where: { id: currentPayment.leaseId },
        include: { unit: true, tenant: true }
      });
      if (lease && lease.status === "PENDING") {
        await prisma.lease.update({
          where: { id: currentPayment.leaseId },
          data: { status: "ACTIVE" }
        });
        
        if (lease.tenant.phoneNumber) {
          const { sendSMS } = await import("@/lib/sms");
          await sendSMS(lease.tenant.phoneNumber, "lease-activation", {
            tenant_name: lease.tenant.name || "Tenant",
            unit_number: lease.unit.unitNumber
          });
        }
      }

      // Notify Payment Approved
      if (lease?.tenant?.phoneNumber) {
        const { sendSMS } = await import("@/lib/sms");
        await sendSMS(lease.tenant.phoneNumber, "payment-approved", {
          tenant_name: lease.tenant.name || "Tenant",
          unit_number: lease.unit.unitNumber || "N/A",
          amount: finalAmount.toLocaleString()
        });
      }
    } catch (notificationError) {
      console.error("Post-approval notification error (non-fatal):", notificationError);
    }

    revalidatePath("/admin/payments");
    revalidatePath("/admin/tenants");
    revalidatePath("/accountant/payments");
    revalidatePath("/accountant/dashboard");
    revalidatePath("/admin/dashboard");
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error) {
    console.error("Approve Payment Error:", error);
    return { success: false, error: "Failed to approve payment" };
  }
}

export async function rejectPayment(paymentId: string) {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser) return { success: false, error: "Unauthorized" };

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        tenant: true,
        lease: { include: { unit: true } }
      }
    });
    if (!payment) return { success: false, error: "Payment not found" };

    // Resolve to primary payment if child payment is selected
    let primaryPaymentId = paymentId;
    if (payment.transactionId) {
      const match = payment.transactionId.match(/(?:_ref_|ref_)([a-z0-9]+)$/i);
      if (match) {
        primaryPaymentId = match[1];
      }
    }

    const childPayments = await prisma.payment.findMany({
      where: {
        OR: [
          { transactionId: { endsWith: `_ref_${primaryPaymentId}` } },
          { transactionId: `ref_${primaryPaymentId}` }
        ]
      }
    });

    const paymentIdsToReject = [primaryPaymentId, ...childPayments.map(p => p.id)];

    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { id: { in: paymentIdsToReject } },
        data: { status: "REJECTED" }
      });

      for (const pid of paymentIdsToReject) {
        await tx.auditLog.create({
          data: {
            userId: sessionUser.id,
            action: `Rejected group payment component ${pid} for primary payment ${primaryPaymentId}`,
            actionType: "PAYMENT_REJECTION",
            oldValue: JSON.stringify({ status: "PENDING" }),
            newValue: JSON.stringify({ status: "REJECTED" }),
            metadata: JSON.stringify({ paymentId: pid })
          }
        });
      }
    });

    if (payment.tenant.phoneNumber) {
      const { sendSMS } = await import("@/lib/sms");
      await sendSMS(payment.tenant.phoneNumber, "payment-rejected", {
        tenant_name: payment.tenant.name || "Tenant",
        unit_number: payment.lease?.unit?.unitNumber || "N/A"
      });
    }

    revalidatePath("/admin/payments");
    revalidatePath("/accountant/payments");
    revalidatePath("/accountant/dashboard");
    revalidatePath("/tenant/payments");
    revalidatePath("/admin/dashboard");
    
    return { success: true };
  } catch (error) {
    console.error("Reject Payment Error:", error);
    return { success: false, error: "Failed to reject payment" };
  }
}

export async function submitPaymentReceipt(paymentId: string, receiptUrl: string) {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser) return { success: false, error: "Unauthorized" };

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { 
        receiptUrl,
        status: "PENDING",
        paidAt: new Date()
      },
    });

    if (payment.transactionId) {
      const { checkAndVerifyPaymentVerifyEt } = await import("@/lib/verify-et");
      checkAndVerifyPaymentVerifyEt(paymentId, payment.transactionId).catch(console.error);
    }

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `Submitted receipt for payment ${paymentId}`,
        actionType: "RECEIPT_SUBMISSION",
        oldValue: JSON.stringify({ status: "PENDING", receiptUrl: null }),
        newValue: JSON.stringify({ status: "PENDING", receiptUrl }),
        metadata: JSON.stringify({ paymentId, receiptUrl })
      }
    });

    revalidatePath("/tenant/payments");
    revalidatePath("/tenant/dashboard");
    revalidatePath("/accountant/payments");
    revalidatePath("/accountant/dashboard");
    revalidatePath("/admin/dashboard");
    
    return { success: true };
  } catch (error) {
    console.error("Submit Receipt Error:", error);
    return { success: false, error: "Failed to submit receipt" };
  }
}

export async function togglePenaltyPaid(penaltyId: string, paid: boolean) {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser) return { success: false, error: "Unauthorized" };

    // Now correctly targets the Penalty table
    const penalty = await prisma.penalty.findUnique({ where: { id: penaltyId } });
    if (!penalty) return { success: false, error: "Penalty record not found" };

    await prisma.penalty.update({
      where: { id: penaltyId },
      data: { 
        status: paid ? "PAID" : "UNPAID",
        paidAmount: paid ? penalty.amount : 0,
        paidAt: paid ? new Date() : null
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `${paid ? "Marked" : "Unmarked"} penalty ${penaltyId} as paid`,
        actionType: "PENALTY_TOGGLE",
        oldValue: JSON.stringify({ status: penalty.status, paidAmount: penalty.paidAmount }),
        newValue: JSON.stringify({ status: paid ? "PAID" : "UNPAID", paidAmount: paid ? penalty.amount : 0 }),
        metadata: JSON.stringify({ penaltyId, paid })
      }
    });

    revalidatePath("/admin/payments");
    revalidatePath("/accountant/payments");
    revalidatePath("/admin/dashboard");
    
    return { success: true };
  } catch (error) {
    console.error("Toggle Penalty Paid Error:", error);
    return { success: false, error: "Failed to update penalty status" };
  }
}

export async function approvePaymentSystem(
  paymentId: string, 
  penaltyAmountReceived?: number,
  actualAmountReceived?: number
) {
  try {
    const defaultAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" }
    });
    if (!defaultAdmin) return { success: false, error: "System administrator not found" };

    const currentPayment = await prisma.payment.findUnique({ 
      where: { id: paymentId },
      include: { 
        lease: { 
          include: { 
            unit: true,
            penalties: { orderBy: { dueDate: "asc" } }
          } 
        } 
      }
    });
    if (!currentPayment) return { success: false, error: "Payment not found" };

    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    const finalAmount = actualAmountReceived !== undefined ? actualAmountReceived : currentPayment.amount;

    // Retrieve active merged group leases
    const groupLeases = await getMergedGroupLeases(currentPayment.leaseId, currentPayment.tenantId, prisma);
    
    if (groupLeases.length > 1) {
      // ── MERGED GROUP PAYMENT APPROVAL ──────────────────────────────────────
      const totalGroupRent = groupLeases.reduce((sum: number, l: any) => sum + l.unit.rentAmount, 0) || 1;
      
      // Calculate share for each lease
      let totalAssigned = 0;
      const leaseShares = new Map<string, number>();
      for (let i = 0; i < groupLeases.length; i++) {
        const l = groupLeases[i];
        if (i === groupLeases.length - 1) {
          leaseShares.set(l.id, Math.max(0, Math.round((finalAmount - totalAssigned) * 100) / 100));
        } else {
          const share = Math.round((finalAmount * (l.unit.rentAmount / totalGroupRent)) * 100) / 100;
          leaseShares.set(l.id, share);
          totalAssigned += share;
        }
      }

      await prisma.$transaction(async (tx) => {
        // 1. Process primary payment record
        const primaryShare = leaseShares.get(currentPayment.leaseId) || 0;
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: "APPROVED",
            amount: primaryShare,
            approvedBy: defaultAdmin.id,
            paidAt: new Date()
          }
        });

        // 2. Process secondary leases
        for (const l of groupLeases) {
          if (l.id === currentPayment.leaseId) continue;
          
          const lShare = leaseShares.get(l.id) || 0;
          // Check if there is already a PENDING payment for this lease on the same dueDate
          const existingPending = await tx.payment.findFirst({
            where: {
              leaseId: l.id,
              status: "PENDING"
            }
          });

          if (existingPending) {
            await tx.payment.update({
              where: { id: existingPending.id },
              data: {
                status: "APPROVED",
                amount: lShare,
                approvedBy: defaultAdmin.id,
                paidAt: new Date(),
                receiptUrl: currentPayment.receiptUrl,
                senderName: currentPayment.senderName,
                transactionId: currentPayment.transactionId ? `${currentPayment.transactionId}_ref_${currentPayment.id}` : `ref_${currentPayment.id}`
              }
            });
          } else {
            await tx.payment.create({
              data: {
                leaseId: l.id,
                tenantId: currentPayment.tenantId,
                amount: lShare,
                dueDate: currentPayment.dueDate,
                status: "APPROVED",
                type: currentPayment.type,
                approvedBy: defaultAdmin.id,
                paidAt: new Date(),
                receiptUrl: currentPayment.receiptUrl,
                senderName: currentPayment.senderName,
                transactionId: currentPayment.transactionId ? `${currentPayment.transactionId}_ref_${currentPayment.id}` : `ref_${currentPayment.id}`
              }
            });
          }
        }

        // 3. Mark units as OCCUPIED and leases as ACTIVE (if not sealed)
        for (const l of groupLeases) {
          await tx.unit.update({
            where: { id: l.unitId },
            data: { status: "OCCUPIED" }
          });
          
          await tx.lease.update({
            where: { id: l.id },
            data: { status: l.status === "SEALED" ? "SEALED" : "ACTIVE" }
          });
        }

        // 4. Recalculate lease state chronologically for all leases in the group
        for (const l of groupLeases) {
          await recalculateLeaseStateInternal(l.id, tx);
        }

        // 5. Create Audit Logs
        for (const l of groupLeases) {
          const lShare = leaseShares.get(l.id) || 0;
          await tx.auditLog.create({
            data: {
              userId: defaultAdmin.id,
              action: `System Approved group payment share of ${lShare} for Unit ${l.unit.unitNumber}. (Primary payment: ${paymentId})`,
              actionType: "PAYMENT_APPROVAL",
              oldValue: JSON.stringify({ status: "PENDING" }),
              newValue: JSON.stringify({ status: "APPROVED", amount: lShare }),
              metadata: JSON.stringify({ paymentId, leaseId: l.id, amount: lShare })
            }
          });
        }
      });
      
      // Post-approval notifications
      try {
        const lease = await prisma.lease.findUnique({ 
          where: { id: currentPayment.leaseId },
          include: { unit: true, tenant: true }
        });
        if (lease?.tenant?.phoneNumber) {
          const { sendSMS } = await import("@/lib/sms");
          await sendSMS(lease.tenant.phoneNumber, "payment-approved", {
            tenant_name: lease.tenant.name || "Tenant",
            unit_number: lease.unit.unitNumber || "N/A",
            amount: finalAmount.toLocaleString()
          });
        }
      } catch (notificationError) {
        console.error("Post-approval notification error (non-fatal):", notificationError);
      }

      revalidatePath("/admin/payments");
      revalidatePath("/admin/tenants");
      revalidatePath("/accountant/payments");
      revalidatePath("/accountant/dashboard");
      revalidatePath("/admin/dashboard");
      revalidatePath("/", "layout");
      
      return { success: true };
    }

    const monthlyRent = currentPayment.lease.unit.rentAmount;
    
    // Fetch all approved payments for this lease so we can calculate arrears
    const approvedPayments = await prisma.payment.findMany({
      where: { leaseId: currentPayment.leaseId, status: "APPROVED" }
    });

    const gapMonths = getLeaseArrearMonths(new Date(currentPayment.lease.startDate), approvedPayments);
    gapMonths.sort((a, b) => a.getTime() - b.getTime());

    let fundsRemaining = finalAmount + currentPayment.lease.advanceBalance;
    let actualPenaltyPaid = 0;
    let monthsCovered = 0;
    
    const finalizedPenaltiesToCreate: any[] = [];
    const finalizedPenaltiesToUpdate: any[] = [];
    
    // Fetch existing database penalties that are UNPAID for this lease
    const unpaidDbPenalties = currentPayment.lease.penalties || [];
    
    const dbPenaltyMap = new Map<string, any>();
    for (const p of unpaidDbPenalties) {
      const d = new Date(p.dueDate);
      dbPenaltyMap.set(`${d.getFullYear()}-${d.getMonth()}`, p);
    }

    let clearedAllArrears = true;
    for (const gd of gapMonths) {
      if (fundsRemaining >= monthlyRent) {
        fundsRemaining -= monthlyRent;
        monthsCovered++;
      } else {
        clearedAllArrears = false;
        break;
      }
    }
    
    if (clearedAllArrears && fundsRemaining >= monthlyRent) {
      const extraMonths = Math.floor(fundsRemaining / monthlyRent);
      monthsCovered += extraMonths;
      fundsRemaining = fundsRemaining % monthlyRent;
    }

    const coveredMonthsList = gapMonths.slice(0, monthsCovered);
    for (const gd of coveredMonthsList) {
      const leaseStartDate = new Date(currentPayment.lease.startDate);
      const startEt = toEthiopian(leaseStartDate);
      const gdEt = toEthiopian(gd);
      const isStartMonth = gdEt.year === startEt.year && gdEt.month === startEt.month;
      
      const hasPenalty = !currentPayment.lease.unit.penaltyExempt && hasLatePenalty(gd, settings) && !(isStartMonth && approvedPayments.length === 0);
      const penaltyAmount = hasPenalty ? (monthlyRent * ((settings?.lateFeePercentage || 5) / 100)) : 0;
      
      if (penaltyAmount <= 0) continue;

      const monthKey = `${gd.getFullYear()}-${gd.getMonth()}`;
      const dbPenalty = dbPenaltyMap.get(monthKey);
      
      let currentPenaltyOwed = penaltyAmount;
      if (dbPenalty) {
        if (dbPenalty.status === "WAIVED") {
          continue;
        } else {
          currentPenaltyOwed = dbPenalty.amount - dbPenalty.paidAmount;
        }
      }
      
      if (currentPenaltyOwed > 0) {
        const toPay = Math.min(currentPenaltyOwed, fundsRemaining);
        if (toPay > 0) {
          actualPenaltyPaid += toPay;
          fundsRemaining -= toPay;
        }
        
        if (dbPenalty) {
          if (toPay > 0) {
            finalizedPenaltiesToUpdate.push({
              id: dbPenalty.id,
              paidAmount: dbPenalty.paidAmount + toPay,
              status: (dbPenalty.paidAmount + toPay) >= dbPenalty.amount ? "PAID" : "PARTIAL"
            });
          }
        } else {
          finalizedPenaltiesToCreate.push({
            amount: penaltyAmount,
            paidAmount: toPay,
            status: toPay >= penaltyAmount ? "PAID" : toPay > 0 ? "PARTIAL" : "UNPAID",
            dueDate: gd
          });
        }
      }
    }
    
    const newAdvanceBalance = fundsRemaining;
    
    // Unified chronological coverage end calculation
    let currentCoverageEnd: Date;
    if (approvedPayments.length > 0) {
      const sortedApproved = approvedPayments.map(p => ({
        coverageEnd: getEthiopianMonthEnd(new Date(p.advanceUntil || p.dueDate))
      })).sort((a, b) => b.coverageEnd.getTime() - a.coverageEnd.getTime());
      
      currentCoverageEnd = sortedApproved[0].coverageEnd;
    } else {
      // If no approved payments, start one month before lease.startDate unless skipped
      const startEt = toEthiopian(new Date(currentPayment.lease.startDate));
      const maxDays = getDaysInEthiopianMonth(startEt.year, startEt.month);
      if (startEt.day === maxDays) {
        currentCoverageEnd = new Date(currentPayment.lease.startDate);
      } else {
        currentCoverageEnd = addEthiopianMonths(new Date(currentPayment.lease.startDate), -1);
      }
    }

    let finalAdvanceUntil = currentCoverageEnd;
    if (monthsCovered > 0) {
      finalAdvanceUntil = addEthiopianMonths(new Date(currentCoverageEnd), monthsCovered);
    }

    // ── Execute Transaction ────────────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      // 1. Update Payment Status
      await tx.payment.update({
        where: { id: paymentId },
        data: { 
          status: "APPROVED",
          amount: finalAmount,
          penalty: actualPenaltyPaid,
          advanceUntil: finalAdvanceUntil,
          paidAt: new Date(),
          approver: { connect: { id: defaultAdmin.id } },
        },
      });

      // 2. Settle Penalties
      for (const pToCreate of finalizedPenaltiesToCreate) {
        await tx.penalty.create({
          data: {
            leaseId: currentPayment.leaseId,
            tenantId: currentPayment.tenantId,
            amount: pToCreate.amount,
            paidAmount: pToCreate.paidAmount,
            status: pToCreate.status,
            dueDate: pToCreate.dueDate,
            paidAt: new Date()
          }
        });
      }

      for (const pToUpdate of finalizedPenaltiesToUpdate) {
        await tx.penalty.update({
          where: { id: pToUpdate.id },
          data: {
            paidAmount: pToUpdate.paidAmount,
            status: pToUpdate.status,
            paidAt: new Date()
          }
        });
      }

      // 3. Handle Advance Balance & Coverage Extension
      await tx.lease.update({
        where: { id: currentPayment.leaseId },
        data: { 
          advanceBalance: newAdvanceBalance,
          status: "ACTIVE"
        }
      });

      // Update Unit status if it was vacant
      await tx.unit.update({
        where: { id: currentPayment.lease.unitId },
        data: { status: "OCCUPIED" }
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: defaultAdmin.id,
          action: `[Verify.ET Auto] Approved payment of ${finalAmount} (penalty: ${actualPenaltyPaid}, rent: ${finalAmount - actualPenaltyPaid}). New balance: ${newAdvanceBalance}`,
          actionType: "PAYMENT_APPROVAL",
          oldValue: JSON.stringify({ status: "PENDING", advanceBalance: currentPayment.lease.advanceBalance }),
          newValue: JSON.stringify({ status: "APPROVED", advanceBalance: newAdvanceBalance }),
          metadata: JSON.stringify({ paymentId, amount: finalAmount, actualPenaltyPaid, newAdvanceBalance })
        }
      });
    });

    // ── STEP 5: Final Revalidation & Notifications ─────────────────────────
    try {
      const lease = await prisma.lease.findUnique({ 
        where: { id: currentPayment.leaseId },
        include: { unit: true, tenant: true }
      });
      if (lease && lease.status === "PENDING") {
        await prisma.lease.update({
          where: { id: currentPayment.leaseId },
          data: { status: "ACTIVE" }
        });
        
        if (lease.tenant.phoneNumber) {
          const { sendSMS } = await import("@/lib/sms");
          await sendSMS(lease.tenant.phoneNumber, "lease-activation", {
            tenant_name: lease.tenant.name || "Tenant",
            unit_number: lease.unit.unitNumber
          });
        }
      }

      // Notify Payment Approved
      if (lease?.tenant?.phoneNumber) {
        const { sendSMS } = await import("@/lib/sms");
        await sendSMS(lease.tenant.phoneNumber, "payment-approved", {
          tenant_name: lease.tenant.name || "Tenant",
          unit_number: lease.unit.unitNumber || "N/A",
          amount: finalAmount.toLocaleString()
        });
      }
    } catch (notificationError) {
      console.error("Post-approval notification error (non-fatal):", notificationError);
    }

    revalidatePath("/admin/payments");
    revalidatePath("/admin/tenants");
    revalidatePath("/accountant/payments");
    revalidatePath("/accountant/dashboard");
    revalidatePath("/admin/dashboard");
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error) {
    console.error("Approve Payment System Error:", error);
    return { success: false, error: "Failed to approve payment" };
  }
}

export async function changePaymentAttachment(paymentId: string, formData: FormData) {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser || (sessionUser.role !== "ACCOUNTANT" && sessionUser.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    if (!file || file.size === 0) {
      return { success: false, error: "No file provided" };
    }

    const { uploadFile } = await import("./storage");
    const uploadResult = await uploadFile(file);
    if (!uploadResult.success || !uploadResult.url) {
      return { success: false, error: uploadResult.error || "Failed to upload file" };
    }

    const receiptUrl = uploadResult.url;

    const currentPayment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    const newStatus = (currentPayment?.status === "APPROVED") ? "APPROVED" : "PENDING";

    await prisma.payment.update({
      where: { id: paymentId },
      data: { 
        receiptUrl,
        status: newStatus,
        paidAt: currentPayment?.paidAt || new Date()
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `Updated attachment for payment ${paymentId} to ${receiptUrl}`,
        actionType: "PAYMENT_ATTACHMENT_UPDATE",
        oldValue: JSON.stringify({ receiptUrl: currentPayment?.receiptUrl, status: currentPayment?.status }),
        newValue: JSON.stringify({ receiptUrl, status: newStatus }),
        metadata: JSON.stringify({ paymentId, receiptUrl })
      }
    });

    revalidatePath("/admin/payments");
    revalidatePath("/accountant/payments");
    revalidatePath("/admin/dashboard");
    revalidatePath("/accountant/dashboard");
    revalidatePath("/tenant/payments");
    revalidatePath("/tenant/dashboard");
    revalidatePath("/", "layout");
    
    return { success: true, receiptUrl };
  } catch (error: any) {
    console.error("Change Payment Attachment Error:", error);
    return { success: false, error: error.message || "Failed to update attachment" };
  }
}

export async function recalculateLeaseStateInternal(leaseId: string, tx: any) {
  // 1. Reset all late fee penalties for this lease to UNPAID (except waived ones)
  await tx.penalty.updateMany({
    where: { 
      leaseId,
      status: { not: "WAIVED" }
    },
    data: {
      status: "UNPAID",
      paidAmount: 0,
      paidAt: null
    }
  });

  // 2. Fetch all APPROVED payments for this lease sorted chronologically by dueDate, then createdAt
  const approvedPayments = await tx.payment.findMany({
    where: { leaseId, status: "APPROVED" },
    orderBy: [
      { dueDate: "asc" },
      { createdAt: "asc" }
    ]
  });

  // 3. Simulate sequential approval
  const lease = await tx.lease.findUnique({
    where: { id: leaseId },
    include: { unit: true }
  });
  if (!lease) throw new Error("Lease not found");

  const monthlyRent = lease.unit.rentAmount;
  const settings = await tx.systemSettings.findUnique({ where: { id: "global" } });
  const leaseStartDate = new Date(lease.startDate);

  let currentAdvanceBalance = 0;
  const processedPayments: any[] = [];

  for (const p of approvedPayments) {
    const gapMonths = getLeaseArrearMonths(leaseStartDate, processedPayments);
    gapMonths.sort((a, b) => a.getTime() - b.getTime());

    let fundsRemaining = p.amount + currentAdvanceBalance;
    let actualPenaltyPaid = 0;
    let monthsCovered = 0;

    // Fetch penalties that exist in the database (they were reset to 0 in step 1, but might have been partially paid by previous iterations)
    const currentPenalties = await tx.penalty.findMany({
      where: { leaseId }
    });
    const dbPenaltyMap = new Map();
    for (const pen of currentPenalties) {
      const d = new Date(pen.dueDate);
      dbPenaltyMap.set(`${d.getFullYear()}-${d.getMonth()}`, pen);
    }

    const finalizedPenaltiesToCreate: any[] = [];
    const finalizedPenaltiesToUpdate: any[] = [];

    let clearedAllArrears = true;
    for (const gd of gapMonths) {
      if (fundsRemaining >= monthlyRent) {
        fundsRemaining -= monthlyRent;
        monthsCovered++;
      } else {
        clearedAllArrears = false;
        break;
      }
    }
    
    if (clearedAllArrears && fundsRemaining >= monthlyRent) {
      const extraMonths = Math.floor(fundsRemaining / monthlyRent);
      monthsCovered += extraMonths;
      fundsRemaining = fundsRemaining % monthlyRent;
    }

    const coveredMonthsList = gapMonths.slice(0, monthsCovered);
    for (const gd of coveredMonthsList) {
      const gdEt = toEthiopian(gd);
      const startEt = toEthiopian(leaseStartDate);
      const isStartMonth = gdEt.year === startEt.year && gdEt.month === startEt.month;
      
      const hasPenalty = !lease.unit.penaltyExempt && hasLatePenalty(gd, settings) && !(isStartMonth && processedPayments.length === 0);
      const penaltyAmount = hasPenalty ? (monthlyRent * ((settings?.lateFeePercentage || 5) / 100)) : 0;
      
      if (penaltyAmount <= 0) continue;

      const monthKey = `${gd.getFullYear()}-${gd.getMonth()}`;
      const dbPenalty = dbPenaltyMap.get(monthKey);
      
      let currentPenaltyOwed = penaltyAmount;
      if (dbPenalty) {
        if (dbPenalty.status === "WAIVED") {
          continue;
        } else {
          currentPenaltyOwed = dbPenalty.amount - dbPenalty.paidAmount;
        }
      }
      
      if (currentPenaltyOwed > 0) {
        const toPay = Math.min(currentPenaltyOwed, fundsRemaining);
        if (toPay > 0) {
          actualPenaltyPaid += toPay;
          fundsRemaining -= toPay;
        }
        
        if (dbPenalty) {
          if (toPay > 0) {
            finalizedPenaltiesToUpdate.push({
              id: dbPenalty.id,
              paidAmount: dbPenalty.paidAmount + toPay,
              status: (dbPenalty.paidAmount + toPay) >= dbPenalty.amount ? "PAID" : "PARTIAL"
            });
          }
        } else {
          finalizedPenaltiesToCreate.push({
            amount: penaltyAmount,
            paidAmount: toPay,
            status: toPay >= penaltyAmount ? "PAID" : toPay > 0 ? "PARTIAL" : "UNPAID",
            dueDate: gd
          });
        }
      }
    }
    
    currentAdvanceBalance = fundsRemaining;

    let currentCoverageEnd;
    if (processedPayments.length > 0) {
      const sortedApproved = processedPayments.map(ap => ({
        coverageEnd: getEthiopianMonthEnd(new Date(ap.advanceUntil || ap.dueDate))
      })).sort((a, b) => b.coverageEnd.getTime() - a.coverageEnd.getTime());
      currentCoverageEnd = sortedApproved[0].coverageEnd;
    } else {
      const startEt = toEthiopian(leaseStartDate);
      const maxDays = getDaysInEthiopianMonth(startEt.year, startEt.month);
      if (startEt.day === maxDays) {
        currentCoverageEnd = leaseStartDate;
      } else {
        currentCoverageEnd = addEthiopianMonths(leaseStartDate, -1);
      }
    }

    let finalAdvanceUntil = currentCoverageEnd;
    if (monthsCovered > 0) {
      finalAdvanceUntil = addEthiopianMonths(new Date(currentCoverageEnd), monthsCovered);
    }

    // Update payment record in database
    await tx.payment.update({
      where: { id: p.id },
      data: {
        penalty: actualPenaltyPaid,
        advanceUntil: finalAdvanceUntil
      }
    });

    // Create or update penalties
    for (const pToCreate of finalizedPenaltiesToCreate) {
      await tx.penalty.create({
        data: {
          leaseId,
          tenantId: lease.tenantId,
          amount: pToCreate.amount,
          paidAmount: pToCreate.paidAmount,
          status: pToCreate.status,
          dueDate: pToCreate.dueDate,
          paidAt: new Date()
        }
      });
    }

    for (const pToUpdate of finalizedPenaltiesToUpdate) {
      await tx.penalty.update({
        where: { id: pToUpdate.id },
        data: {
          paidAmount: pToUpdate.paidAmount,
          status: pToUpdate.status,
          paidAt: new Date()
        }
      });
    }

    processedPayments.push({
      ...p,
      penalty: actualPenaltyPaid,
      advanceUntil: finalAdvanceUntil
    });
  }

  // Update lease advanceBalance in database
  await tx.lease.update({
    where: { id: leaseId },
    data: { advanceBalance: currentAdvanceBalance }
  });
}

export async function updateApprovedPaymentAmount(paymentId: string, newAmount: number) {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser || (sessionUser.role !== "ACCOUNTANT" && sessionUser.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { lease: { include: { unit: true } } }
    });
    if (!payment) return { success: false, error: "Payment not found" };
    if (payment.status !== "APPROVED") {
      return { success: false, error: "Payment is not approved yet" };
    }

    // Check if group payment
    let primaryPaymentId = paymentId;
    if (payment.transactionId) {
      const match = payment.transactionId.match(/(?:_ref_|ref_)([a-z0-9]+)$/i);
      if (match) {
        primaryPaymentId = match[1];
      }
    }

    const childPayments = await prisma.payment.findMany({
      where: {
        OR: [
          { transactionId: { endsWith: `_ref_${primaryPaymentId}` } },
          { transactionId: `ref_${primaryPaymentId}` }
        ]
      }
    });

    if (childPayments.length > 0 || primaryPaymentId !== paymentId) {
      // It's a group payment!
      // If they edited a child payment directly, just update its amount individually.
      // If they edited the primary payment, treat newAmount as the new total and split it!
      if (paymentId !== primaryPaymentId) {
        // Child payment edited directly
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: paymentId },
            data: { amount: newAmount }
          });
          await recalculateLeaseStateInternal(payment.leaseId, tx);
          
          await tx.auditLog.create({
            data: {
              userId: sessionUser.id,
              action: `Updated child approved payment INV-${paymentId.slice(0, 8).toUpperCase()} amount from ${payment.amount} to ${newAmount}. Recalculated lease.`,
              actionType: "PAYMENT_APPROVAL",
              oldValue: JSON.stringify({ amount: payment.amount }),
              newValue: JSON.stringify({ amount: newAmount }),
              metadata: JSON.stringify({ paymentId, oldAmount: payment.amount, newAmount })
            }
          });
        });
      } else {
        // Primary payment edited: split newAmount proportionally
        const groupLeases = await getMergedGroupLeases(payment.leaseId, payment.tenantId, prisma);
        const totalGroupRent = groupLeases.reduce((sum: number, l: any) => sum + l.unit.rentAmount, 0) || 1;
        
        let totalAssigned = 0;
        const leaseShares = new Map<string, number>();
        for (let i = 0; i < groupLeases.length; i++) {
          const l = groupLeases[i];
          if (i === groupLeases.length - 1) {
            leaseShares.set(l.id, Math.max(0, Math.round((newAmount - totalAssigned) * 100) / 100));
          } else {
            const share = Math.round((newAmount * (l.unit.rentAmount / totalGroupRent)) * 100) / 100;
            leaseShares.set(l.id, share);
            totalAssigned += share;
          }
        }

        await prisma.$transaction(async (tx) => {
          // Update primary payment amount
          const primaryShare = leaseShares.get(primaryPaymentId) || 0;
          await tx.payment.update({
            where: { id: primaryPaymentId },
            data: { amount: primaryShare }
          });

          // Update child payments amounts
          for (const cp of childPayments) {
            const cpShare = leaseShares.get(cp.leaseId) || 0;
            await tx.payment.update({
              where: { id: cp.id },
              data: { amount: cpShare }
            });
          }

          // Recalculate chronological states for all leases in the group
          for (const l of groupLeases) {
            await recalculateLeaseStateInternal(l.id, tx);
          }

          // Audit logs
          for (const l of groupLeases) {
            const lShare = leaseShares.get(l.id) || 0;
            await tx.auditLog.create({
              data: {
                userId: sessionUser.id,
                action: `Updated group payment share to ${lShare} for Unit ${l.unit.unitNumber} (primary payment total updated to ${newAmount})`,
                actionType: "PAYMENT_APPROVAL",
                oldValue: JSON.stringify({}),
                newValue: JSON.stringify({ amount: lShare }),
                metadata: JSON.stringify({ paymentId: primaryPaymentId, leaseId: l.id, amount: lShare })
              }
            });
          }
        });
      }
    } else {
      // Standard single payment update
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: paymentId },
          data: { amount: newAmount }
        });
        await recalculateLeaseStateInternal(payment.leaseId, tx);
        
        await tx.auditLog.create({
          data: {
            userId: sessionUser.id,
            action: `Updated approved payment INV-${paymentId.slice(0, 8).toUpperCase()} amount from ${payment.amount} to ${newAmount}. Triggered chronological lease state recalculation.`,
            actionType: "PAYMENT_APPROVAL",
            oldValue: JSON.stringify({ amount: payment.amount }),
            newValue: JSON.stringify({ amount: newAmount }),
            metadata: JSON.stringify({ paymentId, oldAmount: payment.amount, newAmount })
          }
        });
      });
    }

    revalidatePath("/admin/payments");
    revalidatePath("/accountant/payments");
    revalidatePath("/admin/dashboard");
    revalidatePath("/accountant/dashboard");
    revalidatePath("/tenant/payments");
    revalidatePath("/tenant/dashboard");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Update Approved Payment Amount Error:", error);
    return { success: false, error: error.message || "Failed to update payment amount" };
  }
}

export async function waivePenalty({
  penaltyId,
  leaseId,
  dueDate,
  amount
}: {
  penaltyId: string;
  leaseId: string;
  dueDate: string | Date;
  amount: number;
}) {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "ACCOUNTANT" && sessionUser.role !== "MANAGER")) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. If it's an existing database penalty (does not start with 'dynamic-')
    if (!penaltyId.startsWith("dynamic-")) {
      const penalty = await prisma.penalty.findUnique({
        where: { id: penaltyId },
        include: {
          lease: {
            include: {
              tenant: true,
              unit: true
            }
          }
        }
      });

      if (!penalty) {
        return { success: false, error: "Penalty record not found" };
      }

      await prisma.penalty.update({
        where: { id: penaltyId },
        data: {
          status: "WAIVED",
          paidAmount: 0,
          paidAt: null
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Waived late fee penalty of ${penalty.amount} ETB for unit ${penalty.lease?.unit?.unitNumber} (tenant: ${penalty.lease?.tenant?.name || "N/A"})`,
          actionType: "PENALTY_TOGGLE",
          oldValue: JSON.stringify({ status: penalty.status, paidAmount: penalty.paidAmount }),
          newValue: JSON.stringify({ status: "WAIVED", paidAmount: 0 }),
          metadata: JSON.stringify({ penaltyId })
        }
      });
    } else {
      // 2. If it is a dynamic penalty, create a new record in database with status 'WAIVED'
      const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: {
          tenant: true,
          unit: true
        }
      });

      if (!lease) {
        return { success: false, error: "Lease not found" };
      }

      const formattedDueDate = new Date(dueDate);

      // Check if a penalty for this dueDate already exists in case of race conditions
      const existing = await prisma.penalty.findFirst({
        where: {
          leaseId,
          dueDate: formattedDueDate
        }
      });

      if (existing) {
        await prisma.penalty.update({
          where: { id: existing.id },
          data: {
            status: "WAIVED",
            paidAmount: 0,
            paidAt: null
          }
        });
      } else {
        await prisma.penalty.create({
          data: {
            leaseId,
            tenantId: lease.tenantId,
            amount,
            paidAmount: 0,
            status: "WAIVED",
            dueDate: formattedDueDate,
            paidAt: null
          }
        });
      }

      await prisma.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: `Waived dynamic late fee penalty of ${amount} ETB for unit ${lease.unit.unitNumber} (tenant: ${lease.tenant.name || "N/A"})`,
          actionType: "PENALTY_TOGGLE",
          oldValue: null,
          newValue: JSON.stringify({ status: "WAIVED", amount }),
          metadata: JSON.stringify({ leaseId, dueDate: formattedDueDate, amount })
        }
      });
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/accountant/dashboard");
    revalidatePath("/manager/dashboard");

    return { success: true };
  } catch (error: any) {
    console.error("Waive Penalty Error:", error);
    return { success: false, error: error.message || "Failed to waive penalty" };
  }
}

export async function unwaivePenalty(penaltyId: string) {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "ACCOUNTANT" && sessionUser.role !== "MANAGER")) {
      return { success: false, error: "Unauthorized" };
    }

    const penalty = await prisma.penalty.findUnique({
      where: { id: penaltyId },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: true
          }
        }
      }
    });

    if (!penalty) {
      return { success: false, error: "Penalty record not found" };
    }

    await prisma.penalty.update({
      where: { id: penaltyId },
      data: {
        status: "UNPAID"
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `Unwaived late fee penalty of ${penalty.amount} ETB for unit ${penalty.lease?.unit?.unitNumber} (tenant: ${penalty.lease?.tenant?.name || "N/A"})`,
        actionType: "PENALTY_TOGGLE",
        oldValue: JSON.stringify({ status: penalty.status }),
        newValue: JSON.stringify({ status: "UNPAID" }),
        metadata: JSON.stringify({ penaltyId })
      }
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/accountant/dashboard");
    revalidatePath("/manager/dashboard");
    revalidatePath("/admin/payments");
    revalidatePath("/accountant/payments");
    revalidatePath("/admin/penalty");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Unwaive Penalty Error:", error);
    return { success: false, error: error.message || "Failed to unwaive penalty" };
  }
}


