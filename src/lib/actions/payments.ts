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

    const monthlyRent = currentPayment.lease.unit.rentAmount;
    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    
    // Fetch all approved payments for this lease so we can calculate arrears
    const approvedPayments = await prisma.payment.findMany({
      where: { leaseId: currentPayment.leaseId, status: "APPROVED" }
    });

    const gapMonths = getLeaseArrearMonths(new Date(currentPayment.lease.startDate), approvedPayments);
    gapMonths.sort((a, b) => a.getTime() - b.getTime());

    const finalAmount = actualAmountReceived !== undefined ? actualAmountReceived : currentPayment.amount;
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
      if (fundsRemaining <= 0) {
        clearedAllArrears = false;
        break;
      }
      
      const diffDays = getDaysPastEthiopianExpiry(gd);
      const leaseStartDate = new Date(currentPayment.lease.startDate);
      const startEt = toEthiopian(leaseStartDate);
      const gdEt = toEthiopian(gd);
      const isStartMonth = gdEt.year === startEt.year && gdEt.month === startEt.month;
      
      const hasPenalty = !currentPayment.lease.unit.penaltyExempt && hasLatePenalty(gd, settings) && !(isStartMonth && approvedPayments.length === 0);
      const penaltyAmount = hasPenalty ? (monthlyRent * ((settings?.lateFeePercentage || 5) / 100)) : 0;
      
      const monthKey = `${gd.getFullYear()}-${gd.getMonth()}`;
      const dbPenalty = dbPenaltyMap.get(monthKey);
      
      let currentPenaltyOwed = penaltyAmount;
      let currentPenaltyPaid = 0;
      
      if (dbPenalty) {
        currentPenaltyOwed = dbPenalty.amount - dbPenalty.paidAmount;
      }
      
      // 1. Settle penalty for this month first
      if (currentPenaltyOwed > 0) {
        const toPay = Math.min(currentPenaltyOwed, fundsRemaining);
        currentPenaltyPaid = toPay;
        actualPenaltyPaid += toPay;
        fundsRemaining -= toPay;
        
        if (dbPenalty) {
          finalizedPenaltiesToUpdate.push({
            id: dbPenalty.id,
            paidAmount: dbPenalty.paidAmount + toPay,
            status: (dbPenalty.paidAmount + toPay) >= dbPenalty.amount ? "PAID" : "PARTIAL"
          });
        } else {
          finalizedPenaltiesToCreate.push({
            amount: penaltyAmount,
            paidAmount: toPay,
            status: toPay >= penaltyAmount ? "PAID" : "PARTIAL",
            dueDate: gd
          });
        }
      }
      
      // 2. Settle rent for this month
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

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "REJECTED" },
      include: {
        tenant: true,
        lease: { include: { unit: true } }
      }
    });

    if (payment.tenant.phoneNumber) {
      const { sendSMS } = await import("@/lib/sms");
      await sendSMS(payment.tenant.phoneNumber, "payment-rejected", {
        tenant_name: payment.tenant.name || "Tenant",
        unit_number: payment.lease?.unit?.unitNumber || "N/A"
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: `Rejected payment ${paymentId}`,
        actionType: "PAYMENT_REJECTION",
        oldValue: JSON.stringify({ status: "PENDING" }),
        newValue: JSON.stringify({ status: "REJECTED" }),
        metadata: JSON.stringify({ paymentId })
      }
    });

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

    const monthlyRent = currentPayment.lease.unit.rentAmount;
    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    
    // Fetch all approved payments for this lease so we can calculate arrears
    const approvedPayments = await prisma.payment.findMany({
      where: { leaseId: currentPayment.leaseId, status: "APPROVED" }
    });

    const gapMonths = getLeaseArrearMonths(new Date(currentPayment.lease.startDate), approvedPayments);
    gapMonths.sort((a, b) => a.getTime() - b.getTime());

    const finalAmount = actualAmountReceived !== undefined ? actualAmountReceived : currentPayment.amount;
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
      if (fundsRemaining <= 0) {
        clearedAllArrears = false;
        break;
      }
      
      const diffDays = getDaysPastEthiopianExpiry(gd);
      const leaseStartDate = new Date(currentPayment.lease.startDate);
      const startEt = toEthiopian(leaseStartDate);
      const gdEt = toEthiopian(gd);
      const isStartMonth = gdEt.year === startEt.year && gdEt.month === startEt.month;
      
      const hasPenalty = !currentPayment.lease.unit.penaltyExempt && hasLatePenalty(gd, settings) && !(isStartMonth && approvedPayments.length === 0);
      const penaltyAmount = hasPenalty ? (monthlyRent * ((settings?.lateFeePercentage || 5) / 100)) : 0;
      
      const monthKey = `${gd.getFullYear()}-${gd.getMonth()}`;
      const dbPenalty = dbPenaltyMap.get(monthKey);
      
      let currentPenaltyOwed = penaltyAmount;
      let currentPenaltyPaid = 0;
      
      if (dbPenalty) {
        currentPenaltyOwed = dbPenalty.amount - dbPenalty.paidAmount;
      }
      
      // 1. Settle penalty for this month first
      if (currentPenaltyOwed > 0) {
        const toPay = Math.min(currentPenaltyOwed, fundsRemaining);
        currentPenaltyPaid = toPay;
        actualPenaltyPaid += toPay;
        fundsRemaining -= toPay;
        
        if (dbPenalty) {
          finalizedPenaltiesToUpdate.push({
            id: dbPenalty.id,
            paidAmount: dbPenalty.paidAmount + toPay,
            status: (dbPenalty.paidAmount + toPay) >= dbPenalty.amount ? "PAID" : "PARTIAL"
          });
        } else {
          finalizedPenaltiesToCreate.push({
            amount: penaltyAmount,
            paidAmount: toPay,
            status: toPay >= penaltyAmount ? "PAID" : "PARTIAL",
            dueDate: gd
          });
        }
      }
      
      // 2. Settle rent for this month
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

