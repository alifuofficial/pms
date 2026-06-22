const ftp = require("basic-ftp");
const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  const pool = new Pool({ connectionString });
  let settings;
  try {
    const res = await pool.query('SELECT * FROM "SystemSettings" WHERE id = \'global\';');
    settings = res.rows[0];
    console.log("Database FTP settings loaded:", {
      ftpHost: settings.ftpHost,
      ftpPort: settings.ftpPort,
      ftpUser: settings.ftpUser,
      ftpPass: settings.ftpPass ? "***" : null,
      ftpBaseUrl: settings.ftpBaseUrl,
      ftpEnabled: settings.ftpEnabled
    });
  } catch (dbErr) {
    console.error("DB Error:", dbErr);
    await pool.end();
    return;
  }
  await pool.end();

  const client = new ftp.Client(15000);
  client.ftp.ipFamily = 4;
  client.ftp.verbose = true;
  try {
    await client.access({
      host: settings.ftpHost,
      port: settings.ftpPort || 21,
      user: settings.ftpUser || "",
      password: settings.ftpPass || "",
    });

    console.log("Connected successfully! Listing root directory...");
    const list = await client.list();
    console.log("Files and directories in root:");
    console.log(list.map(f => `${f.type === 2 ? 'DIR' : 'FILE'}: ${f.name} (size: ${f.size})`));

    for (const item of list) {
      if (item.type === 2) {
        console.log(`\nListing contents of directory: ${item.name}`);
        await client.cd(item.name);
        const subList = await client.list();
        console.log(subList.map(f => `${f.type === 2 ? 'DIR' : 'FILE'}: ${f.name} (size: ${f.size})`));
        await client.cd("..");
      }
    }
  } catch (err) {
    console.error("FTP Error:", err);
  } finally {
    client.close();
  }
}

run();
