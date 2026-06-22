import { getPublicUnitStatus } from "../src/lib/actions/qr";

async function main() {
  console.log("Calling getPublicUnitStatus for B01...");
  const result = await getPublicUnitStatus("4MYLJZQF9A");
  console.log("\n--- PRODUCTION getPublicUnitStatus OUTPUT FOR B01 ---");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
