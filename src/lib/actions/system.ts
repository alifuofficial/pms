"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function factoryResetSystem() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    // Run database wipe in a transaction to ensure integrity
    await prisma.$transaction(async (tx) => {
      // 1. Delete audit logs
      await tx.auditLog.deleteMany();

      // 2. Delete payments
      await tx.payment.deleteMany();

      // 3. Delete leases
      await tx.lease.deleteMany();

      // 4. Delete units
      await tx.unit.deleteMany();

      // 5. Delete properties
      await tx.property.deleteMany();

      // 6. Delete bank accounts
      await tx.bankAccount.deleteMany();

      // 7. Delete SMS templates
      await tx.smsTemplate.deleteMany();

      // 8. Delete all users except ADMIN, ACCOUNTANT, and MANAGER
      await tx.user.deleteMany({
        where: {
          role: {
            notIn: ["ADMIN", "ACCOUNTANT", "MANAGER"]
          }
        }
      });

      // 9. Reset System Settings to defaults
      await tx.systemSettings.upsert({
        where: { id: "global" },
        update: {
          systemName: "NexusPMS",
          organizationName: null,
          tinNumber: null,
          address: null,
          website: null,
          phone: null,
          logoUrl: null,
          primaryColor: "#2563eb",
          supportEmail: null,
          currency: "ETB",
          calendarType: "GREGORIAN",
          smtpHost: null,
          smtpPort: null,
          smtpUser: null,
          smtpPass: null,
          ftpHost: null,
          ftpPort: null,
          ftpUser: null,
          ftpPass: null,
          smsEthiopiaKey: null
        },
        create: {
          id: "global",
          systemName: "NexusPMS",
          currency: "ETB",
          primaryColor: "#2563eb",
          calendarType: "GREGORIAN"
        }
      });
    });

    // Revalidate the entire application cache
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error) {
    console.error("Factory Reset Error:", error);
    return { success: false, error: "Critical failure during factory reset. Please contact support." };
  }
}
