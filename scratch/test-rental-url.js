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
  const file1 = "3b66306b-1b00-41c5-88c9-eb9ab857a87a-SITCO_Global_Logo_Design.png";
  const file2 = "1ae69a11-243f-443c-829a-85402aed61f6-SITCO_Global_Logo_Design.png";
  
  await testUrl(`https://storage.soretiinternational.com/rental/${file1}`);
  await testUrl(`https://storage.soretiinternational.com/rental/${file2}`);
}

run();
