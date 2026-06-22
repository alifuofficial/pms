const { Pool } = require("pg");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

// Phone helper logic
function normalizePhoneNumber(phone) {
  if (!phone) return phone;
  let normalized = phone.replace(/\s+/g, "");
  if (normalized.startsWith("+251")) {
    normalized = normalized.substring(1);
  } else if (normalized.startsWith("09") || normalized.startsWith("07")) {
    normalized = "251" + normalized.substring(1);
  }
  return normalized;
}

async function run() {
  console.log("Connecting to Supabase...");
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Find a unit
    const unit = await prisma.unit.findFirst();
    if (!unit) {
      console.log("No units found in database!");
      return;
    }
    console.log(`Found unit: ${unit.unitNumber} (ID: ${unit.id})`);

    // Mock active manager
    const manager = await prisma.user.findFirst({ where: { role: "MANAGER" } });
    if (!manager) {
      console.log("No manager found in database!");
      return;
    }
    console.log(`Using manager: ${manager.name} (ID: ${manager.id})`);

    // Mock tenant data
    const data = {
      name: "Test Tenant A",
      email: "test_tenant_a@soreti.com",
      phoneNumber: "0911223344",
      unitId: unit.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days later
      leaseAgreementUrl: "",
      payment: {
        amount: 5000,
        type: "MONTHLY",
        advanceUntil: undefined,
        receiptUrl: "https://example.com/receipt.png"
      }
    };

    console.log("Starting simulation transaction...");
    const tempPassword = await bcrypt.hash("Soreti123!", 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      console.log("Step 1: Creating user...");
      const normalizedPhone = normalizePhoneNumber(data.phoneNumber);
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email || `${normalizedPhone}@pms.local`,
          phoneNumber: normalizedPhone,
          passwordHash: tempPassword,
          role: "TENANT",
        },
      });
      console.log(`   User created: ${user.id}`);

      // 2. Create Lease
      console.log("Step 2: Creating lease...");
      const lease = await tx.lease.create({
        data: {
          tenantId: user.id,
          unitId: data.unitId,
          startDate: data.startDate,
          endDate: data.endDate,
          status: "PENDING",
          leaseAgreementUrl: data.leaseAgreementUrl,
        },
      });
      console.log(`   Lease created: ${lease.id}`);

      // 3. Create initial Payment
      console.log("Step 3: Creating payment...");
      await tx.payment.create({
        data: {
          tenantId: user.id,
          leaseId: lease.id,
          amount: data.payment.amount,
          dueDate: data.startDate,
          type: data.payment.type,
          advanceUntil: data.payment.advanceUntil,
          receiptUrl: data.payment.receiptUrl,
          status: "PENDING",
        },
      });
      console.log("   Payment created.");

      // 4. Update Unit Status
      console.log("Step 4: Updating unit...");
      await tx.unit.update({
        where: { id: data.unitId },
        data: { status: "OCCUPIED" },
      });
      console.log("   Unit status updated to OCCUPIED.");

      // 5. Audit Log
      console.log("Step 5: Creating audit log...");
      await tx.auditLog.create({
        data: {
          userId: manager.id,
          action: `Registered tenant ${data.name} for unit ${data.unitId}`,
          actionType: "TENANT_REGISTRATION",
          newValue: JSON.stringify({ name: data.name, phoneNumber: data.phoneNumber, unitId: data.unitId }),
          metadata: JSON.stringify({ name: data.name, unitId: data.unitId, email: data.email })
        }
      });
      console.log("   Audit log created.");

      return user;
    });

    console.log("Transaction succeeded! Removing test data to prevent clutter...");
    // Rollback changes manually since transaction was committed
    await prisma.auditLog.deleteMany({ where: { userId: manager.id, actionType: "TENANT_REGISTRATION" } });
    await prisma.payment.deleteMany({ where: { tenantId: result.id } });
    await prisma.lease.deleteMany({ where: { tenantId: result.id } });
    await prisma.unit.update({ where: { id: unit.id }, data: { status: "AVAILABLE" } });
    await prisma.user.delete({ where: { id: result.id } });
    console.log("Cleanup complete!");

  } catch (err) {
    console.error("\n--- SIMULATION ERROR ---");
    console.error(err);
    console.error("------------------------\n");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
