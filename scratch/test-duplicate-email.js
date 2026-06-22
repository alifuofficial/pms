const { Pool } = require("pg");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log("Connecting to Supabase...");
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Attempting to create user with duplicate email...");
    await prisma.user.create({
      data: {
        name: "Duplicate User",
        email: "admin@soreti.com", // existing email
        role: "TENANT",
      }
    });
  } catch (err) {
    console.log("\n--- ERROR DETECTED ---");
    console.log("Type:", err.constructor.name);
    console.log("Code:", err.code);
    console.log("Message:", err.message);
    console.log("Keys:", Object.keys(err));
    console.log("Full Error:", err);
    console.log("----------------------\n");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
