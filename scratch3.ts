import { prisma } from "./src/lib/prisma.ts";

async function run() {
  const lease = await prisma.lease.findFirst({
    where: { unit: { qrSlug: "BHM8PEW79M" } },
    include: { payments: true }
  });
  console.log(JSON.stringify(lease, null, 2));
}

run().catch(console.error);
