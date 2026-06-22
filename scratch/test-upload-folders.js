const http = require("https");

const urls = [
  "https://storage.soretiinternational.com/upload/test-antigravity.txt",
  "https://storage.soretiinternational.com/uploads/test-antigravity.txt",
  "https://storage.soretiinternational.com/rental/upload/test-antigravity.txt",
  "https://storage.soretiinternational.com/rental/uploads/test-antigravity.txt",
  "https://storage.soretiinternational.com/upload/logo-1777745395950.png",
  "https://storage.soretiinternational.com/uploads/logo-1777745395950.png",
  "https://storage.soretiinternational.com/rental/upload/logo-1777745395950.png",
  "https://storage.soretiinternational.com/rental/uploads/logo-1777745395950.png"
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
