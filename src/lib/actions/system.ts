"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolveSessionUser } from "./auth-helper";

export async function granularResetSystem(options: {
  tenants?: boolean;
  unitsProperties?: boolean;
  financials?: boolean;
  settings?: boolean;
  all?: boolean;
}) {
  try {
    const sessionUser = await resolveSessionUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    // Run database wipe in a transaction to ensure integrity
    await prisma.$transaction(async (tx) => {
      const isAll = options.all || (options.tenants && options.unitsProperties && options.financials && options.settings);

      if (isAll) {
        // 1. Delete audit logs first (linked to users)
        await tx.auditLog.deleteMany();

        // 2. Delete SMS Logs and OTPs
        await tx.smsLog.deleteMany();
        await tx.otp.deleteMany();

        // 3. Delete Penalties
        await tx.penalty.deleteMany();

        // 4. Delete Payments
        await tx.payment.deleteMany();

        // 5. Delete Refunds
        await tx.refund.deleteMany();

        // 6. Delete Leases
        await tx.lease.deleteMany();

        // 7. Delete Units
        await tx.unit.deleteMany();

        // 8. Delete Properties
        await tx.property.deleteMany();

        // 9. Delete Bank Accounts and Templates
        await tx.bankAccount.deleteMany();
        await tx.smsTemplate.deleteMany();

        // 10. Delete all users except ADMIN, ACCOUNTANT, and MANAGER
        await tx.user.deleteMany({
          where: {
            role: {
              notIn: ["ADMIN", "ACCOUNTANT", "MANAGER"]
            }
          }
        });

        // 11. Reset System Settings to defaults
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
        return;
      }

      // --- GRANULAR RESET SCENARIOS ---

      // 1. Reset Units & Properties (cascades to leases, payments, penalties, refunds)
      if (options.unitsProperties) {
        await tx.refund.deleteMany();
        await tx.penalty.deleteMany();
        await tx.payment.deleteMany();
        await tx.lease.deleteMany();
        await tx.unit.deleteMany();
        await tx.property.deleteMany();
      }

      // 2. Reset Tenants (cascades to leases, payments, penalties, refunds, and logs belonging to tenants)
      if (options.tenants) {
        // If properties are NOT deleted, clear only tenant-bound leases and records
        if (!options.unitsProperties) {
          await tx.refund.deleteMany({ where: { tenant: { role: "TENANT" } } });
          await tx.penalty.deleteMany({ where: { tenant: { role: "TENANT" } } });
          await tx.payment.deleteMany({ where: { tenant: { role: "TENANT" } } });
          await tx.lease.deleteMany({ where: { tenant: { role: "TENANT" } } });
          
          // Revert all units back to AVAILABLE status since their tenants are deleted
          // (Except for company-owned units, which should be COMPANY_OWNED)
          await tx.unit.updateMany({
            where: { companyOwned: false },
            data: { status: "AVAILABLE" }
          });
          await tx.unit.updateMany({
            where: { companyOwned: true },
            data: { status: "COMPANY_OWNED" }
          });
        }

        // Delete audit logs linked to tenants
        await tx.auditLog.deleteMany({
          where: { user: { role: "TENANT" } }
        });

        // Delete tenant users
        await tx.user.deleteMany({
          where: { role: "TENANT" }
        });
      }

      // 3. Reset Financials & Payments only (retains properties, units, tenants, and active leases)
      if (options.financials && !options.unitsProperties && !options.tenants) {
        await tx.refund.deleteMany();
        await tx.penalty.deleteMany();
        await tx.payment.deleteMany();
        
        // Revert pre-paid lease balances back to zero
        await tx.lease.updateMany({
          data: { advanceBalance: 0 }
        });
      }

      // 4. Reset Settings (wipes configurations & bank channels)
      if (options.settings) {
        await tx.bankAccount.deleteMany();
        
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
      }
    });

    // Revalidate the entire application cache
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error: any) {
    console.error("Granular Reset Error:", error);
    return { success: false, error: error.message || "Failed to perform granular reset." };
  }
}

export async function factoryResetSystem() {
  return granularResetSystem({ all: true });
}
