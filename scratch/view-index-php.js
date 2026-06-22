const https = require("https");

https.get("https://storage.soretiinternational.com/", (res) => {
  let data = "";
  res.on("data", (chunk) => { data += chunk; });
  res.on("end", () => {
    console.log(data);
  });
}).on("error", (e) => {
  console.error(e);
});
