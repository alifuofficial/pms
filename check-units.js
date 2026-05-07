const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.unit.findMany({ select: { id: true, unitNumber: true, qrSlug: true } })
  .then(u => console.log(JSON.stringify(u, null, 2)))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
