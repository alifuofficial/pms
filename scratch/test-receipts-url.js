const https = require("https");

function testUrl(url) {
  return new Promise((resolve) => {
    console.log(`Fetching: ${url}`);
    https.get(url, (res) => {
      console.log(`Status Code: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      resolve(res.statusCode);
    }).on("error", (e) => {
      console.error(`Error: ${e.message}`);
      resolve(500);
    });
  });
}

async function run() {
  const filename = "3b66306b-1b00-41c5-88c9-eb9ab857a87a-SITCO_Global_Logo_Design.png";
  
  console.log("--- TEST 1: With /upload/ path ---");
  await testUrl(`https://storage.soretiinternational.com/upload/${filename}`);

  console.log("\n--- TEST 2: Without /upload/ path ---");
  await testUrl(`https://storage.soretiinternational.com/${filename}`);
}

run();
