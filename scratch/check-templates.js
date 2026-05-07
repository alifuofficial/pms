const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkTemplates() {
  const templates = await prisma.smsTemplate.findMany();
  console.log("TEMPLATES:", JSON.stringify(templates, null, 2));
}

checkTemplates();
