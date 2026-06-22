async function run() {
  console.log("Testing user's production webhook endpoint...");
  const webhookUrl = "https://rental.soretiinternational.com/api/webhooks/verify";
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Timestamp": String(Date.now()),
        "X-Webhook-Signature": "sha256=invalid-signature-for-testing"
      },
      body: JSON.stringify({
        event: "verification.completed",
        requestId: "test-id-123",
        data: {
          status: "success",
          verified: true,
          referenceNumber: "FT-TEST-123"
        }
      })
    });
    
    console.log("Status:", response.status, response.statusText);
    const text = await response.text();
    console.log("Response text:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
run();
