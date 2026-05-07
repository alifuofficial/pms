"use server";

import { prisma } from "@/lib/prisma";
import { parseCSV, generateCSV } from "@/lib/csv";
import { revalidatePath } from "next/cache";

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
      include: { property: { select: { name: true } } },
      orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }]
    });

    const headers = ["PropertyName", "UnitNumber", "Type", "Floor", "Size", "RentAmount"];
    const data = units.map(u => ({
      PropertyName: u.property.name,
      UnitNumber: u.unitNumber,
      Type: u.type,
      Floor: u.floor?.toString() || "",
      Size: u.size?.toString() || "",
      RentAmount: u.rentAmount.toString()
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

      // Find property ID
      let propertyId = propertiesCache[propName];
      if (!propertyId) {
        const prop = await prisma.property.findFirst({
          where: { name: { equals: propName } }
        });
        if (prop) {
          propertyId = prop.id;
          propertiesCache[propName] = prop.id;
        } else {
          // Property not found, skip unit
          errorCount++;
          continue;
        }
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

      if (existingUnit) {
        skippedCount++;
      } else {
        await prisma.unit.create({
          data: {
            propertyId: propertyId,
            unitNumber: unitNumber,
            type: row["Type"]?.trim() || "Standard",
            floor: row["Floor"] ? parseInt(row["Floor"]) : null,
            size: row["Size"] ? parseFloat(row["Size"]) : null,
            rentAmount: rentAmount,
            status: "AVAILABLE",
            // Generate a simple qrSlug placeholder, though real system uses random strings
            qrSlug: `${propertyId.slice(-4)}-${unitNumber}-${Date.now().toString().slice(-4)}`
          }
        });
        importedCount++;
      }
    }

    revalidatePath("/admin/units");
    return { 
      success: true, 
      message: `Imported ${importedCount} units. Skipped ${skippedCount}. Errors: ${errorCount}.` 
    };
  } catch (error: any) {
    console.error("Import Units Error:", error);
    return { success: false, error: "Failed to import units. Check CSV format." };
  }
}
