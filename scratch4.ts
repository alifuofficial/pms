import { prisma } from "./src/lib/prisma.ts";

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
  console.log("ALL UNITS:");
  units.forEach(u => {
    console.log(`Unit ${u.unitNumber} - qrSlug: ${u.qrSlug}`);
    u.leases.forEach(l => {
      console.log(`  Lease ${l.id} - status: ${l.status}`);
      l.payments.forEach(p => {
        console.log(`    Payment ${p.id} - due: ${p.dueDate} - status: ${p.status}`);
      });
    });
  });
}

run().catch(console.error);
