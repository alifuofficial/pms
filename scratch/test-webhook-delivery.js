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

    const webhookUrl = "https://httpbin.org/post";
    console.log(`Sending POST /api/verify/test-webhook to verify.et for webhookUrl: ${webhookUrl}`);

    const response = await fetch("https://verify.et/api/verify/test-webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.verifyEtApiKey
      },
      body: JSON.stringify({
        webhookUrl,
        scenario: "success"
      })
    });

    console.log("Response HTTP Status:", response.status, response.statusText);
    const text = await response.text();
    console.log("Response text:", text);

    try {
      const data = JSON.parse(text);
      console.log("Parsed JSON:", data);
    } catch (e) {
      console.error("Failed to parse response as JSON:", e.message);
    }

  } catch (err) {
    console.error("Error executing script:", err);
  } finally {
    await pool.end();
  }
}

run();
