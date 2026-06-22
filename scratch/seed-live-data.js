const { Pool } = require("pg");
const crypto = require("crypto");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  const pool = new Pool({ connectionString });
  console.log("Connecting to Supabase production database...");
  
  try {
    // Start transaction
    await pool.query("BEGIN;");

    console.log("Fetching pre-seeded manager and accountant user IDs...");
    const managerRes = await pool.query('SELECT id FROM "User" WHERE email = $1 LIMIT 1;', ['manager@soreti.com']);
    if (managerRes.rows.length === 0) {
      throw new Error("Manager user manager@soreti.com not found. Please run the default seed first!");
    }
    const managerId = managerRes.rows[0].id;

    const accountantRes = await pool.query('SELECT id FROM "User" WHERE email = $1 LIMIT 1;', ['accountant@soreti.com']);
    const accountantId = accountantRes.rows.length > 0 ? accountantRes.rows[0].id : null;

    console.log("Cleaning up previous sample transaction records (if any)...");
    // Clean up previous runs to avoid duplicates (safely in correct order of dependency)
    await pool.query('DELETE FROM "Penalty" WHERE id LIKE \'sample-%\';');
    await pool.query('DELETE FROM "Payment" WHERE id LIKE \'sample-%\';');
    await pool.query('DELETE FROM "Lease" WHERE id LIKE \'sample-%\';');
    await pool.query('DELETE FROM "Unit" WHERE id LIKE \'sample-%\';');
    await pool.query('DELETE FROM "Property" WHERE id LIKE \'sample-%\';');
    await pool.query('DELETE FROM "User" WHERE id LIKE \'sample-%\';');

    console.log("Seeding properties associated with manager:", managerId);
    // 1. Seed Properties
    const prop1 = { id: "sample-prop-summit", name: "Summit Building", address: "Summit Fiyelbet, Addis Ababa" };
    const prop2 = { id: "sample-prop-bole", name: "Bole Tower", address: "Bole Medhanialem, Addis Ababa" };
    
    await pool.query(
      'INSERT INTO "Property" (id, name, address, "managerId", "accountantId", type, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, \'RESIDENTIAL\', NOW(), NOW());',
      [prop1.id, prop1.name, prop1.address, managerId, accountantId]
    );
    await pool.query(
      'INSERT INTO "Property" (id, name, address, "managerId", "accountantId", type, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, \'RESIDENTIAL\', NOW(), NOW());',
      [prop2.id, prop2.name, prop2.address, managerId, accountantId]
    );

    console.log("Seeding units...");
    // 2. Seed Units (A mix of Occupied, Available, and Maintenance)
    const units = [
      { id: "sample-unit-s1", propertyId: prop1.id, unitNumber: "001", floor: 0, size: 85, type: "Retail", rentAmount: 32000, status: "OCCUPIED", qrSlug: "summit-001" },
      { id: "sample-unit-s2", propertyId: prop1.id, unitNumber: "002", floor: 0, size: 90, type: "Retail", rentAmount: 35000, status: "OCCUPIED", qrSlug: "summit-002" },
      { id: "sample-unit-s3", propertyId: prop1.id, unitNumber: "101", floor: 1, size: 120, type: "Office", rentAmount: 28000, status: "OCCUPIED", qrSlug: "summit-101" },
      { id: "sample-unit-s4", propertyId: prop1.id, unitNumber: "102", floor: 1, size: 110, type: "Office", rentAmount: 26000, status: "OCCUPIED", qrSlug: "summit-102" },
      { id: "sample-unit-s5", propertyId: prop1.id, unitNumber: "201", floor: 2, size: 75, type: "1BR", rentAmount: 18000, status: "AVAILABLE", qrSlug: "summit-201" },
      { id: "sample-unit-s6", propertyId: prop1.id, unitNumber: "202", floor: 2, size: 95, type: "2BR", rentAmount: 22000, status: "AVAILABLE", qrSlug: "summit-202" },
      { id: "sample-unit-s7", propertyId: prop1.id, unitNumber: "301", floor: 3, size: 75, type: "1BR", rentAmount: 18000, status: "MAINTENANCE", qrSlug: "summit-301" },
      
      { id: "sample-unit-b1", propertyId: prop2.id, unitNumber: "101", floor: 1, size: 130, type: "Office", rentAmount: 42000, status: "OCCUPIED", qrSlug: "bole-101" },
      { id: "sample-unit-b2", propertyId: prop2.id, unitNumber: "102", floor: 1, size: 140, type: "Office", rentAmount: 45000, status: "OCCUPIED", qrSlug: "bole-102" },
      { id: "sample-unit-b3", propertyId: prop2.id, unitNumber: "201", floor: 2, size: 95, type: "2BR", rentAmount: 28000, status: "AVAILABLE", qrSlug: "bole-201" },
    ];

    for (const u of units) {
      await pool.query(
        'INSERT INTO "Unit" (id, "propertyId", "unitNumber", floor, size, type, "rentAmount", status, "qrSlug", "qrPrinted", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW());',
        [u.id, u.propertyId, u.unitNumber, u.floor, u.size, u.type, u.rentAmount, u.status, u.qrSlug]
      );
    }

    console.log("Seeding tenants...");
    // 3. Seed Tenants
    const tenants = [
      { id: "sample-tenant-abebe", name: "Abebe Kebede", email: "abebe@soreti.com", phoneNumber: "+251911223344" },
      { id: "sample-tenant-aster", name: "Aster Awoke", email: "aster@soreti.com", phoneNumber: "+251911556677" },
      { id: "sample-tenant-haile", name: "Haile Selassie", email: "haile@soreti.com", phoneNumber: "+251911889900" },
      { id: "sample-tenant-semira", name: "Semira Mohammed", email: "semira@soreti.com", phoneNumber: "+251911112233" },
      { id: "sample-tenant-dawit", name: "Dawit Lema", email: "dawit@soreti.com", phoneNumber: "+251911445566" },
      { id: "sample-tenant-tsion", name: "Tsion Girma", email: "tsion@soreti.com", phoneNumber: "+251911778899" },
    ];

    const tempPassword = "$2b$10$a3.FY.YBlSI85Ms9ZalA1O3EyBmSojB0M3Nwz1Kq6QfyzG0MqMuzC"; // Pre-calculated hash for 'Soreti123!'
    for (const t of tenants) {
      await pool.query(
        'INSERT INTO "User" (id, name, email, "phoneNumber", "passwordHash", role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, \'TENANT\', NOW(), NOW());',
        [t.id, t.name, t.email, t.phoneNumber, tempPassword]
      );
    }

    console.log("Seeding leases...");
    // 4. Seed Leases (ACTIVE leases matching occupied units)
    const leases = [
      { id: "sample-lease-abebe", tenantId: "sample-tenant-abebe", unitId: "sample-unit-s1", start: "2025-10-01", end: "2026-10-01" },
      { id: "sample-lease-aster", tenantId: "sample-tenant-aster", unitId: "sample-unit-s2", start: "2025-11-01", end: "2026-11-01" },
      { id: "sample-lease-haile", tenantId: "sample-tenant-haile", unitId: "sample-unit-s3", start: "2025-12-01", end: "2026-12-01" },
      { id: "sample-lease-semira", tenantId: "sample-tenant-semira", unitId: "sample-unit-s4", start: "2025-09-01", end: "2026-09-01" },
      { id: "sample-lease-dawit", tenantId: "sample-tenant-dawit", unitId: "sample-unit-b1", start: "2026-01-01", end: "2027-01-01" },
      { id: "sample-lease-tsion", tenantId: "sample-tenant-tsion", unitId: "sample-unit-b2", start: "2026-02-01", end: "2027-02-01" },
    ];

    for (const l of leases) {
      await pool.query(
        'INSERT INTO "Lease" (id, "tenantId", "unitId", "startDate", "endDate", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, \'ACTIVE\', NOW(), NOW());',
        [l.id, l.tenantId, l.unitId, new Date(l.start), new Date(l.end)]
      );
    }

    console.log("Seeding historical payments...");
    // 5. Seed historical APPROVED payments over the last 5 months
    // Let's create payments with paidAt dates in Jan, Feb, Mar, Apr, May 2026
    const payments = [
      // Jan 2026 Payments
      { id: "sample-pay-jan-1", tenantId: "sample-tenant-abebe", leaseId: "sample-lease-abebe", amount: 32000, due: "2026-01-01", paidAt: "2026-01-03", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-jan-2", tenantId: "sample-tenant-aster", leaseId: "sample-lease-aster", amount: 35000, due: "2026-01-01", paidAt: "2026-01-02", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-jan-3", tenantId: "sample-tenant-haile", leaseId: "sample-lease-haile", amount: 28000, due: "2026-01-01", paidAt: "2026-01-04", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-jan-4", tenantId: "sample-tenant-semira", leaseId: "sample-lease-semira", amount: 26000, due: "2026-01-01", paidAt: "2026-01-01", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-jan-5", tenantId: "sample-tenant-dawit", leaseId: "sample-lease-dawit", amount: 42000, due: "2026-01-01", paidAt: "2026-01-02", status: "APPROVED", type: "MONTHLY" },

      // Feb 2026 Payments
      { id: "sample-pay-feb-1", tenantId: "sample-tenant-abebe", leaseId: "sample-lease-abebe", amount: 32000, due: "2026-02-01", paidAt: "2026-02-02", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-feb-2", tenantId: "sample-tenant-aster", leaseId: "sample-lease-aster", amount: 35000, due: "2026-02-01", paidAt: "2026-02-03", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-feb-3", tenantId: "sample-tenant-haile", leaseId: "sample-lease-haile", amount: 28000, due: "2026-02-01", paidAt: "2026-02-05", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-feb-4", tenantId: "sample-tenant-semira", leaseId: "sample-lease-semira", amount: 26000, due: "2026-02-01", paidAt: "2026-02-01", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-feb-5", tenantId: "sample-tenant-dawit", leaseId: "sample-lease-dawit", amount: 42000, due: "2026-02-01", paidAt: "2026-02-03", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-feb-6", tenantId: "sample-tenant-tsion", leaseId: "sample-lease-tsion", amount: 45000, due: "2026-02-01", paidAt: "2026-02-02", status: "APPROVED", type: "MONTHLY" },

      // Mar 2026 Payments
      { id: "sample-pay-mar-1", tenantId: "sample-tenant-abebe", leaseId: "sample-lease-abebe", amount: 32000, due: "2026-03-01", paidAt: "2026-03-04", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-mar-2", tenantId: "sample-tenant-aster", leaseId: "sample-lease-aster", amount: 35000, due: "2026-03-01", paidAt: "2026-03-01", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-mar-3", tenantId: "sample-tenant-haile", leaseId: "sample-lease-haile", amount: 28000, due: "2026-03-01", paidAt: "2026-03-05", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-mar-4", tenantId: "sample-tenant-semira", leaseId: "sample-lease-semira", amount: 26000, due: "2026-03-01", paidAt: "2026-03-02", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-mar-5", tenantId: "sample-tenant-dawit", leaseId: "sample-lease-dawit", amount: 84000, due: "2026-03-01", paidAt: "2026-03-03", status: "APPROVED", type: "ADVANCE", advUntil: "2026-05-01" }, // Advance covers March & April
      { id: "sample-pay-mar-6", tenantId: "sample-tenant-tsion", leaseId: "sample-lease-tsion", amount: 45000, due: "2026-03-01", paidAt: "2026-03-02", status: "APPROVED", type: "MONTHLY" },

      // Apr 2026 Payments
      { id: "sample-pay-apr-1", tenantId: "sample-tenant-abebe", leaseId: "sample-lease-abebe", amount: 32000, due: "2026-04-01", paidAt: "2026-04-02", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-apr-2", tenantId: "sample-tenant-aster", leaseId: "sample-lease-aster", amount: 35000, due: "2026-04-01", paidAt: "2026-04-03", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-apr-3", tenantId: "sample-tenant-haile", leaseId: "sample-lease-haile", amount: 28000, due: "2026-04-01", paidAt: "2026-04-02", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-apr-4", tenantId: "sample-tenant-semira", leaseId: "sample-lease-semira", amount: 26000, due: "2026-04-01", paidAt: "2026-04-01", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-apr-5", tenantId: "sample-tenant-tsion", leaseId: "sample-lease-tsion", amount: 45000, due: "2026-04-01", paidAt: "2026-04-05", status: "APPROVED", type: "MONTHLY" },

      // May 2026 Payments (Current Month Collections)
      { id: "sample-pay-may-1", tenantId: "sample-tenant-abebe", leaseId: "sample-lease-abebe", amount: 32000, due: "2026-05-01", paidAt: "2026-05-02", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-may-2", tenantId: "sample-tenant-aster", leaseId: "sample-lease-aster", amount: 35000, due: "2026-05-01", paidAt: "2026-05-03", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-may-3", tenantId: "sample-tenant-haile", leaseId: "sample-lease-haile", amount: 28000, due: "2026-05-01", paidAt: "2026-05-02", status: "APPROVED", type: "MONTHLY" },
      { id: "sample-pay-may-4", tenantId: "sample-tenant-dawit", leaseId: "sample-lease-dawit", amount: 42000, due: "2026-05-01", paidAt: "2026-05-04", status: "APPROVED", type: "MONTHLY" },
      
      // Seeding a PENDING payment for Accountant Approval
      { id: "sample-pay-pending-1", tenantId: "sample-tenant-tsion", leaseId: "sample-lease-tsion", amount: 45000, due: "2026-05-01", paidAt: "2026-05-24", status: "PENDING", type: "MONTHLY", receiptUrl: "https://storage.soretiinternational.com/rental/sample-receipt.png" },
    ];

    for (const p of payments) {
      await pool.query(
        'INSERT INTO "Payment" (id, "tenantId", "leaseId", amount, "dueDate", "paidAt", status, type, "advanceUntil", "receiptUrl", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW());',
        [p.id, p.tenantId, p.leaseId, p.amount, new Date(p.due), p.paidAt ? new Date(p.paidAt) : null, p.status, p.type, p.advUntil ? new Date(p.advUntil) : null, p.receiptUrl || null]
      );
    }

    console.log("Seeding penalties (late fees)...");
    // 6. Seed Unpaid/Paid Penalties to test the penalty widgets and calendar drift arrears
    const penalties = [
      { id: "sample-penalty-1", tenantId: "sample-tenant-semira", leaseId: "sample-lease-semira", amount: 1300, paidAmount: 0, due: "2026-05-10", status: "UNPAID", reason: "5% Late Fee Applied for May 2026" },
      { id: "sample-penalty-2", tenantId: "sample-tenant-haile", leaseId: "sample-lease-haile", amount: 1400, paidAmount: 1400, due: "2026-04-10", paidAt: "2026-04-12", status: "PAID", reason: "5% Late Fee for April 2026" },
    ];

    for (const pen of penalties) {
      await pool.query(
        'INSERT INTO "Penalty" (id, "tenantId", "leaseId", amount, "paidAmount", "dueDate", "paidAt", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW());',
        [pen.id, pen.tenantId, pen.leaseId, pen.amount, pen.paidAmount, new Date(pen.due), pen.paidAt ? new Date(pen.paidAt) : null, pen.status]
      );
    }

    console.log("Commiting transaction...");
    await pool.query("COMMIT;");
    console.log("\nSample live-performance data seeded successfully! All charts, stats, recent actions, and penalty lists are now fully alive with real data.");
  } catch (err) {
    await pool.query("ROLLBACK;");
    console.error("Failed to seed sample database records:", err);
  } finally {
    await pool.end();
  }
}

run();
