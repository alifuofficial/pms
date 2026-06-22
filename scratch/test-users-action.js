const { Pool } = require("pg");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

// Mock NextAuth import for server actions by override
jest = { mock: () => {} }; // ignore if any

// We can just load the createUser code manually or require it
// But let's import it directly! Since it is TypeScript, we can write a dynamic runner.
// Or we can just run the code of createUser directly inside this JS script using the actual prisma client.
// Let's copy the EXACT createUser code into this script so we can run and trace it line-by-line!

const bcrypt = require("bcryptjs");

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

  // Mock inputs
  const mockData = {
    name: "Staff Test User",
    email: "staff_test_9999@soreti.com",
    phoneNumber: "", // Empty string as passed from UI
    role: "MANAGER"
  };

  // Mock Admin Session
  const mockSession = {
    user: {
      id: "cmpj274yk0000w0tckqfdewoq", // Soreti Admin Demo
      role: "ADMIN"
    }
  };

  try {
    console.log("1. Starting user creation simulation...");
    const tempPassword = await bcrypt.hash("Soreti123!", 10);
    console.log("   Password hashed successfully.");

    console.log("2. Running user.create query...");
    const user = await prisma.user.create({
      data: {
        name: mockData.name,
        email: mockData.email,
        phoneNumber: mockData.phoneNumber ? normalizePhoneNumber(mockData.phoneNumber) : undefined,
        passwordHash: tempPassword,
        role: mockData.role
      },
    });
    console.log("   User created successfully in database:", user.id);

    console.log("3. Running auditLog.create query...");
    const audit = await prisma.auditLog.create({
      data: {
        userId: mockSession.user.id,
        action: `Created user ${mockData.name} with role ${mockData.role}`,
        actionType: "USER_CREATION",
        newValue: JSON.stringify({ name: mockData.name, email: mockData.email, role: mockData.role }),
        metadata: JSON.stringify({ userId: user.id })
      }
    });
    console.log("   Audit log created successfully:", audit.id);

    // Clean up
    console.log("4. Cleaning up test data...");
    await prisma.auditLog.delete({ where: { id: audit.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log("   Cleanup finished.");

  } catch (err) {
    console.error("\n--- ERROR CAUGHT ---");
    console.error(err);
    console.error("--------------------\n");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
