const https = require("https");

function testUrl(url) {
  return new Promise((resolve) => {
    console.log(`Fetching: ${url}`);
    https.get(url, (res) => {
      console.log(`Status Code: ${res.statusCode}`);
      resolve(res.statusCode);
    }).on("error", (e) => {
      console.error(`Error: ${e.message}`);
      resolve(500);
    });
  });
}

async function run() {
  const filename = "3b66306b-1b00-41c5-88c9-eb9ab857a87a-SITCO_Global_Logo_Design.png";
  
  console.log("--- TEST A: Primary domain with /upload/ ---");
  await testUrl(`https://soretiinternational.com/upload/${filename}`);

  console.log("\n--- TEST B: Primary domain with /uploads/ ---");
  await testUrl(`https://soretiinternational.com/uploads/${filename}`);

  console.log("\n--- TEST C: Primary domain at root ---");
  await testUrl(`https://soretiinternational.com/${filename}`);
}

run();
