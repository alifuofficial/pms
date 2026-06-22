const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log("Connecting to Supabase...");
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Attempting to create a test user...");
    const user = await prisma.user.create({
      data: {
        name: "Test Admin Staff",
        email: "staff_test_999@soreti.com",
        phoneNumber: "251911999999",
        passwordHash: "$2a$10$tZ3F9gG4q6eL7hU8P9vB.O5V12U5eXz.yP5m5qU5K5B5v5x5e5y5e", // Dummy hash
        role: "MANAGER",
      },
    });
    console.log("User created successfully:", user);

    // Clean up
    console.log("Cleaning up test user...");
    await prisma.user.delete({ where: { id: user.id } });
    console.log("Clean up done.");
  } catch (err) {
    console.error("Prisma User Creation Error:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
