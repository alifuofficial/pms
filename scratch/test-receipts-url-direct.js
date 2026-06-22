const http = require("https");

const urls = [
  "https://storage.soretiinternational.com/receipt-374caff0-fc66-4df1-90d6-11973687e89a-1777746916515.pdf",
  "https://storage.soretiinternational.com/receipt-bc19e9e9-6a01-410d-aa37-49a9d5bf0bec-1777751599762.png",
  "https://storage.soretiinternational.com/receipt-db818598-8617-4017-9a13-b7de15794aef-1777751520447.pdf",
  "https://storage.soretiinternational.com/receipt-727b8e73-fbf9-429b-a6e0-c3e5a7600dec-1777749425601.pdf",
  "https://storage.soretiinternational.com/receipt-64465e62-7b8d-4152-895a-1d1383fa15e1-1777746458636.pdf",
  "https://storage.soretiinternational.com/test-antigravity.txt"
];

function testUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      console.log(`[${res.statusCode}] ${url}`);
      resolve({ url, status: res.statusCode });
    }).on("error", (err) => {
      console.log(`[ERR] ${url}: ${err.message}`);
      resolve({ url, status: "ERROR" });
    });
  });
}

async function run() {
  for (const url of urls) {
    await testUrl(url);
  }
}

run();
