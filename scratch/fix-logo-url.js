const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  const pool = new Pool({ connectionString });
  try {
    console.log("Fixing SystemSettings in database...");
    
    const res = await pool.query('SELECT * FROM "SystemSettings" WHERE id = \'global\';');
    if (res.rows.length > 0) {
      const settings = res.rows[0];
      
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
        console.log("Database updated successfully!");
        console.log("New ftpBaseUrl:", newFtpBaseUrl);
        console.log("New logoUrl:", newLogoUrl);
      } else {
        console.log("No changes needed or already updated!");
      }
    } else {
      console.log("No global SystemSettings found.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
