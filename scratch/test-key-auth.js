const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log("Connecting to Supabase...");
  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query('SELECT * FROM "SystemSettings" WHERE id = $1;', ["global"]);
    const settings = res.rows[0];
    console.log("verifyEtApiKey in DB:", settings.verifyEtApiKey);

    if (!settings.verifyEtApiKey) {
      console.error("No API key found in DB!");
      return;
    }

    console.log("Testing history GET endpoint to verify API key validity...");
    const response = await fetch("https://verify.et/api/verify/history?limit=1", {
      headers: {
        "x-api-key": settings.verifyEtApiKey
      }
    });

    console.log("Response Status:", response.status, response.statusText);
    const text = await response.text();
    console.log("Response text:", text);

  } catch (err) {
    console.error("Error executing script:", err);
  } finally {
    await pool.end();
  }
}

run();
