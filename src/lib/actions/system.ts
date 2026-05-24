"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolveSessionUser } from "./auth-helper";

export async function factoryResetSystem() {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    // Run database wipe in a transaction to ensure integrity
    await prisma.$transaction(async (tx) => {
      // 1. Delete audit logs first (linked to users)
      await tx.auditLog.deleteMany();

      // 2. Delete SMS Logs and OTPs
      await tx.smsLog.deleteMany();
      await tx.otp.deleteMany();

      // 3. Delete Penalties (linked to leases and users)
      await tx.penalty.deleteMany();

      // 4. Delete Payments (linked to leases and users)
      await tx.payment.deleteMany();

      // 5. Delete Leases (linked to units and users)
      await tx.lease.deleteMany();

      // 6. Delete Units (linked to properties)
      await tx.unit.deleteMany();

      // 7. Delete Properties (linked to managers/accountants)
      await tx.property.deleteMany();

      // 8. Delete Bank Accounts and Templates
      await tx.bankAccount.deleteMany();
      await tx.smsTemplate.deleteMany();

      // 9. Delete all users except ADMIN, ACCOUNTANT, and MANAGER
      await tx.user.deleteMany({
        where: {
          role: {
            notIn: ["ADMIN", "ACCOUNTANT", "MANAGER"]
          }
        }
      });

      // 10. Reset System Settings to defaults
      await tx.systemSettings.upsert({
        where: { id: "global" },
        update: {
          systemName: "Soreti Property Rental",
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
          lateFeeEnabled: false,
          lateFeePercentage: 5.0,
          warningFeePercentage: 10.0,
          smtpHost: null,
          smtpPort: null,
          smtpUser: null,
          smtpPass: null,
          ftpHost: null,
          ftpPort: null,
          ftpUser: null,
          ftpPass: null,
          smsEthiopiaKey: null,
          smsEnabled: true,
          maintenanceMode: false
        },
        create: {
          id: "global",
          systemName: "Soreti Property Rental",
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
