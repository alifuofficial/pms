import { prisma } from "./src/lib/prisma.ts";
import { getPublicUnitStatus } from "./src/lib/actions/qr.ts";

async function run() {
  const units = await prisma.unit.findMany({
    include: {
      leases: {
        include: {
          payments: true
        }
      }
    }
  });
  
  for (const u of units) {
    if (u.qrSlug && u.leases.length > 0) {
      console.log(`Testing unit ${u.unitNumber} (slug: ${u.qrSlug})`);
      const status = await getPublicUnitStatus(u.qrSlug);
      console.log(JSON.stringify(status, null, 2));
    }
  }
}

run().catch(console.error);
