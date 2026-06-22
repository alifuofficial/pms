import { getPublicUnitStatus } from "../src/lib/actions/qr";

async function main() {
  const result = await getPublicUnitStatus("4MYLJZQF9A");
  console.log("--- B01 REAL STATUS RESULT ---");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
