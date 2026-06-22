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
    console.log("Fetching first user...");
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log("No user found.");
      return;
    }
    console.log(`Found user: ${user.name} (${user.id})`);

    console.log("Attempting to create an AuditLog...");
    const log = await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "Test Action",
        actionType: "TEST",
        newValue: "Test",
      },
    });
    console.log("AuditLog created successfully:", log);

    // Clean up
    console.log("Cleaning up AuditLog...");
    await prisma.auditLog.delete({ where: { id: log.id } });
    console.log("Clean up done.");
  } catch (err) {
    console.error("Prisma AuditLog Creation Error:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
