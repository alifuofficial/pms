const { Pool } = require("pg");

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log("Connecting to Supabase...");
  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query('SELECT * FROM "SystemSettings" WHERE id = $1;', ["global"]);
    if (res.rows.length === 0) {
      console.error("System settings not found in database!");
      return;
    }
    const settings = res.rows[0];
    console.log("smsEthiopiaKey in database:", settings.smsEthiopiaKey);
    console.log("smsEnabled:", settings.smsEnabled);

    if (!settings.smsEthiopiaKey) {
      console.error("No smsEthiopiaKey configured!");
      return;
    }

    // Let's test a phone number. We'll use the documentation number '251911639555' or similar.
    const msisdn = "251911639555";
    const text = "Soreti PMS SMS Integration test message.";

    console.log(`Sending POST request to smsethiopia.et/api/sms/send with msisdn: ${msisdn}, text: ${text}`);

    const response = await fetch("https://smsethiopia.et/api/sms/send", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "KEY": settings.smsEthiopiaKey 
      },
      body: JSON.stringify({ msisdn, text })
    });

    console.log("HTTP Status:", response.status, response.statusText);
    const responseText = await response.text();
    console.log("Response text:", responseText);

    try {
      const data = JSON.parse(responseText);
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
