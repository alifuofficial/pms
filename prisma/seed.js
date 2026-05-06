const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const bcrypt = require("bcryptjs");

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db"
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const roles = ["ADMIN", "ACCOUNTANT", "MANAGER", "TENANT"];
  const password = await bcrypt.hash("Soreti123!", 10);

  // 1. Seed Users
  for (const role of roles) {
    const email = `${role.toLowerCase()}@soreti.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash: password,
      },
      create: {
        email,
        name: `Soreti ${role.charAt(0) + role.slice(1).toLowerCase()} Demo`,
        passwordHash: password,
        role: role,
      },
    });
    console.log(`Created/Updated user: ${user.email} with role ${user.role}`);
  }

  // 2. Seed System Settings
  await prisma.systemSettings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      systemName: "Soreti Property Rental",
      organizationName: "Soreti International Trading",
      currency: "ETB",
      calendarType: "GREGORIAN",
      primaryColor: "#2563eb",
    },
  });
  console.log("System settings seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
