import { getPublicUnitStatus } from "../src/lib/actions/qr.ts";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  console.log("Fetching GD11 (DE22RDZ296) status...");
  const gd11 = await getPublicUnitStatus("DE22RDZ296");
  console.log("GD11 Status:");
  console.log("  Unit Number:", gd11.unit.unitNumber);
  console.log("  Arrears Count:", gd11.lease.arrearsCount);
  console.log("  Arrears Breakdown:", gd11.lease.arrearsMonths.map(m => `${m.id} (${m.status})`));
  console.log("  Days Left:", gd11.lease.daysLeft);

  console.log("\nFetching GD8 (3U3D7LFUM9) status...");
  const gd8 = await getPublicUnitStatus("3U3D7LFUM9");
  console.log("GD8 Status:");
  console.log("  Unit Number:", gd8.unit.unitNumber);
  console.log("  Arrears Count:", gd8.lease.arrearsCount);
  console.log("  Arrears Breakdown:", gd8.lease.arrearsMonths.map(m => `${m.id} (${m.status})`));
  console.log("  Days Left:", gd8.lease.daysLeft);
  
  process.exit(0);
}

run().catch(console.error);
