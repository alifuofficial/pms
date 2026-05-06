const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const roles = ["ADMIN", "ACCOUNTANT", "MANAGER", "TENANT"];
  const passwordHash = "$2b$10$a3.FY.YBlSI85Ms9ZalA1O3EyBmSojB0M3Nwz1Kq6QfyzG0MqMuzC"; // Pre-calculated hash for 'Soreti123!'

  // 1. Seed Users
  for (const role of roles) {
    const email = `${role.toLowerCase()}@soreti.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash: passwordHash,
      },
      create: {
        email,
        name: `Soreti ${role.charAt(0) + role.slice(1).toLowerCase()} Demo`,
        passwordHash: passwordHash,
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
