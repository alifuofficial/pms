const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const bcrypt = require("bcryptjs");

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db"
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const roles = ["ADMIN", "ACCOUNTANT", "MANAGER", "TENANT"];
  const password = await bcrypt.hash("password123", 10);

  for (const role of roles) {
    const email = `${role.toLowerCase()}@pms.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: `${role.charAt(0) + role.slice(1).toLowerCase()} User`,
        passwordHash: password,
        role: role,
      },
    });
    console.log(`Created user: ${user.email} with role ${user.role}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
