const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$queryRawUnsafe("PRAGMA table_info(Unit)")
  .then(info => console.log(JSON.stringify(info, null, 2)))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
