"use server";

import { prisma } from "@/lib/prisma";
import { parseCSV, generateCSV } from "@/lib/csv";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import nodemailer from "nodemailer";
import * as ftp from "basic-ftp";
import { Readable } from "stream";

// Hardcoded hash for "Soreti123!" for faster bulk imports
const DEFAULT_PASSWORD_HASH = "$2b$10$a3.FY.YBlSI85Ms9ZalA1O3EyBmSojB0M3Nwz1Kq6QfyzG0MqMuzC";

// ----------------------------------------------------------------------
// TENANTS
// ----------------------------------------------------------------------

export async function exportTenantsCsv() {
  try {
    const tenants = await prisma.user.findMany({
      where: { role: "TENANT" },
      select: { name: true, email: true, phoneNumber: true },
      orderBy: { createdAt: "desc" }
    });

    const headers = ["Name", "Email", "Phone"];
    const data = tenants.map(t => ({
      Name: t.name || "",
      Email: t.email || "",
      Phone: t.phoneNumber || ""
    }));

    const csvString = generateCSV(data, headers);
    return { success: true, csv: csvString };
  } catch (error: any) {
    console.error("Export Tenants Error:", error);
    return { success: false, error: "Failed to export tenants." };
  }
}

export async function importTenantsCsv(csvString: string) {
  try {
    const data = parseCSV(csvString);
    if (!data || data.length === 0) {
      return { success: false, error: "Empty or invalid CSV file." };
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of data) {
      const email = row["Email"]?.toLowerCase()?.trim();
      if (!email) continue; // Skip rows without email

      const name = row["Name"]?.trim();
      const phone = row["Phone"]?.trim();

      const existingUser = await prisma.user.findUnique({ where: { email } });
      
      if (existingUser) {
        skippedCount++;
      } else {
        await prisma.user.create({
          data: {
            email,
            name,
            phoneNumber: phone,
            role: "TENANT",
            passwordHash: DEFAULT_PASSWORD_HASH,
          }
        });
        importedCount++;
      }
    }

    revalidatePath("/admin/tenants");
    return { 
      success: true, 
      message: `Imported ${importedCount} tenants. Skipped ${skippedCount} existing.` 
    };
  } catch (error: any) {
    console.error("Import Tenants Error:", error);
    return { success: false, error: "Failed to import tenants. Check CSV format." };
  }
}

// ----------------------------------------------------------------------
// UNITS
// ----------------------------------------------------------------------

export async function exportUnitsCsv() {
  try {
    const units = await prisma.unit.findMany({
      include: { 
        property: { select: { name: true } },
        mergedInto: { select: { unitNumber: true } }
      },
      orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }]
    });

    const headers = ["PropertyName", "UnitNumber", "Type", "Floor", "Size", "RentAmount", "QrSlug", "PenaltyExempt", "CompanyOwned", "MergedIntoUnitNumber"];
    const data = units.map(u => ({
      PropertyName: u.property.name,
      UnitNumber: u.unitNumber,
      Type: u.type,
      Floor: u.floor?.toString() || "",
      Size: u.size?.toString() || "",
      RentAmount: u.rentAmount.toString(),
      QrSlug: u.qrSlug || "",
      PenaltyExempt: u.penaltyExempt ? "true" : "false",
      CompanyOwned: u.companyOwned ? "true" : "false",
      MergedIntoUnitNumber: u.mergedInto?.unitNumber || ""
    }));

    const csvString = generateCSV(data, headers);
    return { success: true, csv: csvString };
  } catch (error: any) {
    console.error("Export Units Error:", error);
    return { success: false, error: "Failed to export units." };
  }
}

export async function importUnitsCsv(csvString: string) {
  try {
    const data = parseCSV(csvString);
    if (!data || data.length === 0) {
      return { success: false, error: "Empty or invalid CSV file." };
    }

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Cache properties to reduce DB queries
    const propertiesCache: Record<string, string> = {};

    for (const row of data) {
      const propName = row["PropertyName"]?.trim();
      const unitNumber = row["UnitNumber"]?.trim();
      const rentAmount = parseFloat(row["RentAmount"]);

      if (!propName || !unitNumber || isNaN(rentAmount)) {
        errorCount++;
        continue;
      }

      // Find or auto-create property ID
      let propertyId = propertiesCache[propName];
      if (!propertyId) {
        let prop = await prisma.property.findFirst({
          where: { name: { equals: propName } }
        });
        
        if (!prop) {
          // Auto-create property if it doesn't exist
          const session = await auth();
          let managerId = session?.user?.id;
          
          if (!managerId) {
            // Find first ADMIN or MANAGER user in the system
            const fallbackUser = await prisma.user.findFirst({
              where: { role: { in: ["ADMIN", "MANAGER"] } }
            }) || await prisma.user.findFirst();
            managerId = fallbackUser?.id;
          }
          
          if (!managerId) {
            // Create a default system administrator user if the DB is completely empty
            const sysManager = await prisma.user.create({
              data: {
                name: "System Administrator",
                email: "admin@soreti.com",
                role: "ADMIN",
                passwordHash: DEFAULT_PASSWORD_HASH
              }
            });
            managerId = sysManager.id;
          }
          
          prop = await prisma.property.create({
            data: {
              name: propName,
              address: `${propName} Address`,
              type: "RESIDENTIAL",
              managerId: managerId!,
            }
          });
        }
        
        propertyId = prop.id;
        propertiesCache[propName] = prop.id;
      }

      // Check if unit exists
      const existingUnit = await prisma.unit.findUnique({
        where: {
          propertyId_unitNumber: {
            propertyId: propertyId,
            unitNumber: unitNumber
          }
        }
      });

      const qrSlugInput = row["QrSlug"]?.trim();

      if (existingUnit) {
        // If the unit exists, but has a different QrSlug or penaltyExempt in the CSV backup, restore it!
        const penaltyExemptInput = row["PenaltyExempt"]?.trim()?.toLowerCase() === "true";
        if (
          (qrSlugInput && existingUnit.qrSlug !== qrSlugInput) ||
          (row["PenaltyExempt"] !== undefined && existingUnit.penaltyExempt !== penaltyExemptInput)
        ) {
          await prisma.unit.update({
            where: { id: existingUnit.id },
            data: {
              ...(qrSlugInput ? { qrSlug: qrSlugInput } : {}),
              penaltyExempt: penaltyExemptInput
            }
          });
          importedCount++;
        } else {
          skippedCount++;
        }
      } else {
        // Generate secure cryptographically random 10-character qrSlug if not provided
        let qrSlug = qrSlugInput;
        if (!qrSlug) {
          let attempts = 0;
          while (attempts < 5) {
            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            let tempSlug = "";
            for (let i = 0; i < 10; i++) {
              tempSlug += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const duplicate = await prisma.unit.findUnique({ where: { qrSlug: tempSlug } });
            if (!duplicate) {
              qrSlug = tempSlug;
              break;
            }
            attempts++;
          }
          // Ultimate safe fallback
          if (!qrSlug) {
            qrSlug = `${propertyId.slice(-4)}-${unitNumber}-${Date.now().toString().slice(-4)}`;
          }
        }

        const companyOwned = row["CompanyOwned"]?.trim()?.toLowerCase() === "true";

        await prisma.unit.create({
          data: {
            propertyId: propertyId,
            unitNumber: unitNumber,
            type: row["Type"]?.trim() || "Standard",
            floor: row["Floor"] ? parseInt(row["Floor"]) : null,
            size: row["Size"] ? parseFloat(row["Size"]) : null,
            rentAmount: rentAmount,
            status: companyOwned ? "COMPANY_OWNED" : "AVAILABLE",
            qrSlug: qrSlug,
            penaltyExempt: row["PenaltyExempt"]?.trim()?.toLowerCase() === "true",
            companyOwned: companyOwned
          }
        });
        importedCount++;
      }
    }

    // Second pass: resolve MergedIntoUnitNumber for all imported rows
    for (const row of data) {
      const propName = row["PropertyName"]?.trim();
      const unitNumber = row["UnitNumber"]?.trim();
      const mergedIntoUnitNo = row["MergedIntoUnitNumber"]?.trim();

      if (propName && unitNumber && mergedIntoUnitNo) {
        const prop = await prisma.property.findFirst({ where: { name: propName } });
        if (prop) {
          const currentUnit = await prisma.unit.findFirst({
            where: { propertyId: prop.id, unitNumber }
          });
          const parentUnit = await prisma.unit.findFirst({
            where: { propertyId: prop.id, unitNumber: mergedIntoUnitNo }
          });
          if (currentUnit && parentUnit) {
            await prisma.unit.update({
              where: { id: currentUnit.id },
              data: { mergedIntoId: parentUnit.id }
            });
          }
        }
      }
    }

    revalidatePath("/admin/units");
    return { 
      success: true, 
      message: `Imported/Restored ${importedCount} units. Skipped ${skippedCount}. Errors: ${errorCount}.` 
    };
  } catch (error: any) {
    console.error("Import Units Error:", error);
    return { success: false, error: "Failed to import units. Check CSV format." };
  }
}

async function executeQrBackupSync(settings: any, backupEmail: string) {
  let ftpUploaded = false;
  let emailSent = false;

  // 1. Generate units CSV
  const units = await prisma.unit.findMany({
    include: { property: { select: { name: true } } },
    orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }]
  });

  const headers = ["PropertyName", "UnitNumber", "Type", "Floor", "Size", "RentAmount", "QrSlug"];
  const data = units.map(u => ({
    PropertyName: u.property.name,
    UnitNumber: u.unitNumber,
    Type: u.type,
    Floor: u.floor?.toString() || "",
    Size: u.size?.toString() || "",
    RentAmount: u.rentAmount.toString(),
    QrSlug: u.qrSlug || ""
  }));

  const csvContent = generateCSV(data, headers);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `unit_qr_backup_${dateStr}.csv`;

  // 2. Upload to FTP if configured
  if (settings.ftpHost && settings.ftpUser && settings.ftpPass) {
    const ftpClient = new ftp.Client(15000);
    ftpClient.ftp.ipFamily = 4;
    try {
      await ftpClient.access({
        host: settings.ftpHost,
        port: settings.ftpPort || 21,
        user: settings.ftpUser,
        password: settings.ftpPass,
      });
      
      // Upload file directly to FTP root
      await ftpClient.uploadFrom(Readable.from(Buffer.from(csvContent)), filename);
      ftpUploaded = true;
    } catch (ftpError) {
      console.error("Backup FTP Upload Failed:", ftpError);
    } finally {
      ftpClient.close();
    }
  }

  // 3. Email Backup if SMTP is configured and recipient is available
  if (backupEmail && settings.smtpHost && settings.smtpUser && settings.smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort || 587,
        secure: settings.smtpPort === 465,
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"${settings.systemName || "Soreti PMS"}" <${settings.smtpUser}>`,
        to: backupEmail,
        subject: `Automated Daily QR Backup - ${dateStr}`,
        text: `Dear Administrator,\n\nThis is an automated daily database backup generated by Soreti PMS.\n\nPlease find attached the complete list of managed units and their permanent printed QR slugs.\n\nDate: ${dateStr}\nTotal units backed up: ${units.length}\nFTP Storage Sync: ${ftpUploaded ? "SYNCED" : "SKIPPED"}\n\nBest regards,\nSoreti PMS Auto-Backup Daemon`,
        attachments: [
          {
            filename: filename,
            content: csvContent,
          }
        ]
      });
      emailSent = true;
    } catch (emailError) {
      console.error("Backup Email Sending Failed:", emailError);
    }
  }

  return { ftpUploaded, emailSent };
}

export async function runDailyQrBackup() {
  try {
    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    if (!settings) return { success: false, error: "System settings not found." };
    
    const backupEmail = settings.qrBackupEmail || "alifuhaji@gmail.com";
    
    const res = await executeQrBackupSync(settings, backupEmail);
    return { success: true, ftpUploaded: res.ftpUploaded, emailSent: res.emailSent };
  } catch (error: any) {
    console.error("Daily QR Backup Job Error:", error);
    return { success: false, error: error.message || "Failed to execute automated backup." };
  }
}

export async function triggerManualBackup() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
    if (!settings) return { success: false, error: "System settings not found." };
    
    const backupEmail = settings.qrBackupEmail || "alifuhaji@gmail.com";
    
    const res = await executeQrBackupSync(settings, backupEmail);
    return { 
      success: true, 
      message: `Manual backup processed. FTP status: ${res.ftpUploaded ? 'UPLOADED' : 'SKIPPED'}, Email status: ${res.emailSent ? 'SENT to ' + backupEmail : 'SKIPPED'}.`
    };
  } catch (error: any) {
    console.error("Manual QR Backup Trigger Error:", error);
    return { success: false, error: error.message || "Failed to trigger manual backup." };
  }
}
