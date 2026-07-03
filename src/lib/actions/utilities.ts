"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { sendSMS } from "@/lib/sms";
import { uploadFile } from "./storage";

export async function getUtilityBills(filters?: {
  propertyId?: string;
  billingMonth?: string;
  type?: "ELECTRICITY" | "WATER";
  status?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const where: any = {};
  
  if (filters?.type) {
    where.type = filters.type;
  }
  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.billingMonth) {
    where.billingMonth = filters.billingMonth;
  }
  if (filters?.propertyId) {
    where.lease = {
      unit: {
        propertyId: filters.propertyId
      }
    };
  }

  // If user is a tenant, restrict to their own bills
  if (session.user.role === "TENANT") {
    where.tenantId = session.user.id;
  }

  return await prisma.utilityBill.findMany({
    where,
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true
        }
      },
      lease: {
        include: {
          unit: {
            include: {
              property: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function createUtilityBillsBatch(data: {
  billingMonth: string;
  type: "ELECTRICITY" | "WATER";
  dueDate: Date;
  bills: Array<{
    leaseId: string;
    tenantId: string;
    previousReading?: number;
    currentReading?: number;
    usage: number;
    rate: number;
    amount: number;
  }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    const createdCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const bill of data.bills) {
        // Skip zero consumption bills if appropriate, but let's record if amount > 0
        if (bill.amount <= 0) continue;

        // Upsert utility bill for the lease/month/type
        await tx.utilityBill.upsert({
          where: {
            id: `bill-${bill.leaseId}-${data.type}-${data.billingMonth}`.replace(/\s+/g, "_")
          },
          update: {
            previousReading: bill.previousReading,
            currentReading: bill.currentReading,
            usage: bill.usage,
            rate: bill.rate,
            amount: bill.amount,
            dueDate: new Date(data.dueDate),
            status: "UNPAID"
          },
          create: {
            id: `bill-${bill.leaseId}-${data.type}-${data.billingMonth}`.replace(/\s+/g, "_"),
            leaseId: bill.leaseId,
            tenantId: bill.tenantId,
            type: data.type,
            billingMonth: data.billingMonth,
            previousReading: bill.previousReading,
            currentReading: bill.currentReading,
            usage: bill.usage,
            rate: bill.rate,
            amount: bill.amount,
            dueDate: new Date(data.dueDate),
            status: "UNPAID"
          }
        });
        count++;
      }
      return count;
    });

    // Dispatch SMS notifications asynchronously in the background
    for (const bill of data.bills) {
      if (bill.amount <= 0) continue;
      (async () => {
        try {
          const tenant = await prisma.user.findUnique({ where: { id: bill.tenantId } });
          if (tenant && tenant.phoneNumber) {
            await sendSMS(
              tenant.phoneNumber,
              "utility-bill-created",
              {
                tenant_name: tenant.name || "Resident",
                utility_type: data.type === "ELECTRICITY" ? "Electricity" : "Water",
                billing_month: data.billingMonth,
                amount: bill.amount.toLocaleString(),
                currency: settings?.currency || "ETB"
              },
              "utility_bill_creation"
            );
          }
        } catch (smsErr) {
          console.error(`Failed to send SMS to tenant ${bill.tenantId}:`, smsErr);
        }
      })();
    }

    revalidatePath("/admin/utilities");
    revalidatePath("/manager/utilities");

    // Fetch the qrSlug of all units affected by this batch to revalidate their public QR page
    try {
      const leaseIds = data.bills.map(b => b.leaseId);
      const leases = await prisma.lease.findMany({
        where: { id: { in: leaseIds } },
        select: { unit: { select: { qrSlug: true } } }
      });
      for (const l of leases) {
        if (l.unit?.qrSlug) {
          revalidatePath(`/u/${l.unit.qrSlug}`);
        }
      }
    } catch (err) {
      console.error("Failed to revalidate public QR pages on batch utility creation:", err);
    }

    return { success: true, count: createdCount };
  } catch (error: any) {
    console.error("Batch Create Utility Bills Error:", error);
    return { success: false, error: error.message || "Failed to create utility bills." };
  }
}

export async function reportUtilityPayment(formData: FormData) {
  try {
    const billId = formData.get("billId") as string;
    const senderName = formData.get("senderName") as string;
    const transactionId = formData.get("transactionId") as string;
    const bankAccountId = formData.get("bankAccountId") as string;
    const screenshot = formData.get("screenshot") as File;

    if (!billId || !senderName || !transactionId) {
      return { success: false, error: "Missing required fields." };
    }

    // Verify duplicate transaction references across utility bills
    const duplicate = await prisma.utilityBill.findFirst({
      where: { transactionId: transactionId.trim() }
    });
    if (duplicate) {
      return { success: false, error: "This transaction reference has already been submitted." };
    }

    let receiptUrl = "";
    if (screenshot && screenshot.size > 0) {
      const uploadResult = await uploadFile(screenshot);
      if (uploadResult.success) {
        receiptUrl = uploadResult.url || "";
      }
    }

    const updated = await prisma.utilityBill.update({
      where: { id: billId },
      data: {
        status: "PENDING",
        senderName,
        transactionId,
        receiptUrl,
        bankAccountId
      },
      include: {
        lease: {
          include: { unit: true }
        }
      }
    });

    if (updated.lease?.unit?.qrSlug) {
      revalidatePath(`/u/${updated.lease.unit.qrSlug}`);
    }
    revalidatePath("/admin/utilities");
    revalidatePath("/manager/utilities");
    revalidatePath("/accountant/utilities");

    return { success: true };
  } catch (error: any) {
    console.error("Report Utility Payment Error:", error);
    return { success: false, error: error.message || "Failed to submit utility payment receipt." };
  }
}

export async function reportAllUtilitiesPayment(formData: FormData) {
  try {
    const billIdsStr = formData.get("billIds") as string;
    const senderName = formData.get("senderName") as string;
    const transactionId = formData.get("transactionId") as string;
    const bankAccountId = formData.get("bankAccountId") as string;
    const screenshot = formData.get("screenshot") as File;

    if (!billIdsStr || !senderName || !transactionId) {
      return { success: false, error: "Missing required fields." };
    }

    const billIds = billIdsStr.split(",");

    // Verify duplicate transaction references across utility bills
    const duplicate = await prisma.utilityBill.findFirst({
      where: { transactionId: transactionId.trim() }
    });
    if (duplicate) {
      return { success: false, error: "This transaction reference has already been submitted." };
    }

    let receiptUrl = "";
    if (screenshot && screenshot.size > 0) {
      const uploadResult = await uploadFile(screenshot);
      if (uploadResult.success) {
        receiptUrl = uploadResult.url || "";
      }
    }

    // Update all bills
    await prisma.utilityBill.updateMany({
      where: { id: { in: billIds } },
      data: {
        status: "PENDING",
        senderName,
        transactionId,
        receiptUrl,
        bankAccountId
      }
    });

    // Revalidate public pages of the units involved
    const bills = await prisma.utilityBill.findMany({
      where: { id: { in: billIds } },
      include: {
        lease: {
          include: { unit: true }
        }
      }
    });

    for (const b of bills) {
      if (b.lease?.unit?.qrSlug) {
        revalidatePath(`/u/${b.lease.unit.qrSlug}`);
      }
    }

    revalidatePath("/admin/utilities");
    revalidatePath("/manager/utilities");
    revalidatePath("/accountant/utilities");

    return { success: true };
  } catch (error: any) {
    console.error("Report All Utilities Payment Error:", error);
    return { success: false, error: error.message || "Failed to submit utility payment receipt." };
  }
}

export async function verifyUtilityPayment(billId: string, status: "APPROVED" | "REJECTED") {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT" && session.user.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    
    const billObj = await prisma.utilityBill.findUnique({
      where: { id: billId },
      include: {
        lease: {
          include: { unit: true }
        }
      }
    });

    if (status === "APPROVED") {
      const updatedBill = await prisma.utilityBill.update({
        where: { id: billId },
        data: {
          status: "PAID",
          paidAt: new Date()
        },
        include: {
          tenant: true
        }
      });

      // Send SMS approval notification
      if (updatedBill.tenant.phoneNumber) {
        await sendSMS(
          updatedBill.tenant.phoneNumber,
          "utility-payment-approved",
          {
            tenant_name: updatedBill.tenant.name || "Resident",
            utility_type: updatedBill.type === "ELECTRICITY" ? "Electricity" : "Water",
            amount: updatedBill.amount.toLocaleString(),
            currency: settings?.currency || "ETB"
          },
          "utility_payment_approval"
        ).catch(console.error);
      }

      // Automatically verify other bills with the same transactionId
      if (updatedBill.transactionId) {
        const relatedBills = await prisma.utilityBill.findMany({
          where: {
            transactionId: updatedBill.transactionId,
            status: "PENDING",
            id: { not: billId }
          },
          include: {
            lease: {
              include: { unit: true }
            },
            tenant: true
          }
        });

        for (const rb of relatedBills) {
          await prisma.utilityBill.update({
            where: { id: rb.id },
            data: {
              status: "PAID",
              paidAt: new Date()
            }
          });

          // Send SMS approval notification for related bill
          if (rb.tenant.phoneNumber) {
            await sendSMS(
              rb.tenant.phoneNumber,
              "utility-payment-approved",
              {
                tenant_name: rb.tenant.name || "Resident",
                utility_type: rb.type === "ELECTRICITY" ? "Electricity" : "Water",
                amount: rb.amount.toLocaleString(),
                currency: settings?.currency || "ETB"
              },
              "utility_payment_approval"
            ).catch(console.error);
          }

          // Revalidate related public page
          if (rb.lease?.unit?.qrSlug) {
            revalidatePath(`/u/${rb.lease.unit.qrSlug}`);
          }
        }
      }
    } else {
      await prisma.utilityBill.update({
        where: { id: billId },
        data: {
          status: "REJECTED"
        }
      });
    }

    if (billObj?.lease?.unit?.qrSlug) {
      revalidatePath(`/u/${billObj.lease.unit.qrSlug}`);
    }

    revalidatePath("/admin/utilities");
    revalidatePath("/manager/utilities");
    revalidatePath("/accountant/utilities");
    return { success: true };
  } catch (error: any) {
    console.error("Verify Utility Payment Error:", error);
    return { success: false, error: error.message || "Failed to verify payment." };
  }
}

export async function getUnitsWithLatestReadings(propertyId: string, type: "ELECTRICITY" | "WATER") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const units = await prisma.unit.findMany({
    where: {
      propertyId,
      status: "OCCUPIED"
    },
    include: {
      leases: {
        where: { status: { in: ["ACTIVE", "SEALED"] } },
        include: {
          tenant: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  const unitsWithReadings = [];
  for (const unit of units) {
    const activeLease = unit.leases[0];
    if (!activeLease) continue;

    const latestBill = await prisma.utilityBill.findFirst({
      where: {
        leaseId: activeLease.id,
        type
      },
      orderBy: {
        readingDate: "desc"
      }
    });

    unitsWithReadings.push({
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      leaseId: activeLease.id,
      tenantId: activeLease.tenant.id,
      tenantName: activeLease.tenant.name || "Resident",
      latestReading: latestBill?.currentReading || 0,
      hasMeter: unit.hasMeter !== false
    });
  }

  return unitsWithReadings;
}

export async function updateUtilityBill(
  billId: string, 
  amount: number, 
  previousReading: number | null, 
  currentReading: number | null
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT" && session.user.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const data: any = { amount };
    if (previousReading !== null && currentReading !== null) {
      data.previousReading = previousReading;
      data.currentReading = currentReading;
      data.usage = Math.max(0, currentReading - previousReading);
    }

    const updated = await prisma.utilityBill.update({
      where: { id: billId },
      data,
      include: {
        lease: {
          include: { unit: true }
        }
      }
    });

    if (updated.lease?.unit?.qrSlug) {
      revalidatePath(`/u/${updated.lease.unit.qrSlug}`);
    }
    revalidatePath("/admin/utilities");
    revalidatePath("/manager/utilities");
    revalidatePath("/accountant/utilities");

    return { success: true };
  } catch (error: any) {
    console.error("Update Utility Bill Error:", error);
    return { success: false, error: error.message || "Failed to update utility bill." };
  }
}
