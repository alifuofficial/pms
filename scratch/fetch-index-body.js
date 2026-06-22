const https = require("https");

https.get("https://storage.soretiinternational.com/", (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  let data = "";
  res.on("data", (chunk) => { data += chunk; });
  res.on("end", () => {
    console.log("Body:");
    console.log(data.substring(0, 1000));
  });
}).on("error", (e) => {
  console.error(e);
});
