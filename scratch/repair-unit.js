const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log("Connecting to Supabase...");
  const pool = new Pool({ connectionString });
  try {
    // 1. Repair SystemSettings ftpBaseUrl and logoUrl
    console.log("1. Checking SystemSettings...");
    const systemRes = await pool.query('SELECT * FROM "SystemSettings" WHERE id = \'global\';');
    if (systemRes.rows.length > 0) {
      const settings = systemRes.rows[0];
      let newFtpBaseUrl = settings.ftpBaseUrl;
      let newLogoUrl = settings.logoUrl;

      if (settings.ftpBaseUrl === "https://storage.soretiinternational.com/upload/") {
        newFtpBaseUrl = "https://storage.soretiinternational.com/rental/";
      }
      if (settings.logoUrl && settings.logoUrl.includes("/upload/")) {
        newLogoUrl = settings.logoUrl.replace("/upload/", "/rental/");
      }

      if (newFtpBaseUrl !== settings.ftpBaseUrl || newLogoUrl !== settings.logoUrl) {
        await pool.query(
          'UPDATE "SystemSettings" SET "ftpBaseUrl" = $1, "logoUrl" = $2 WHERE id = \'global\';',
          [newFtpBaseUrl, newLogoUrl]
        );
        console.log(`   Updated SystemSettings! ftpBaseUrl: ${newFtpBaseUrl}, logoUrl: ${newLogoUrl}`);
      } else {
        console.log("   SystemSettings already correct or no changes needed.");
      }
    }

    // 2. Repair Payment receiptUrl
    console.log("2. Checking Payments...");
    const paymentsRes = await pool.query('SELECT id, "receiptUrl" FROM "Payment" WHERE "receiptUrl" LIKE \'%/upload/%\';');
    console.log(`   Found ${paymentsRes.rows.length} payments with broken /upload/ paths.`);
    for (const payment of paymentsRes.rows) {
      const newUrl = payment.receiptUrl.replace("/upload/", "/rental/");
      await pool.query('UPDATE "Payment" SET "receiptUrl" = $1 WHERE id = $2;', [newUrl, payment.id]);
      console.log(`   Updated Payment ID ${payment.id} receiptUrl to: ${newUrl}`);
    }

    // 3. Repair Lease leaseAgreementUrl
    console.log("3. Checking Leases...");
    const leasesRes = await pool.query('SELECT id, "leaseAgreementUrl" FROM "Lease" WHERE "leaseAgreementUrl" LIKE \'%/upload/%\';');
    console.log(`   Found ${leasesRes.rows.length} leases with broken /upload/ paths.`);
    for (const lease of leasesRes.rows) {
      const newUrl = lease.leaseAgreementUrl.replace("/upload/", "/rental/");
      await pool.query('UPDATE "Lease" SET "leaseAgreementUrl" = $1 WHERE id = $2;', [newUrl, lease.id]);
      console.log(`   Updated Lease ID ${lease.id} leaseAgreementUrl to: ${newUrl}`);
    }

    console.log("\nAll database repairs completed successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
