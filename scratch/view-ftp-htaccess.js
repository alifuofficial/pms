const ftp = require("basic-ftp");
const fs = require("fs");

async function run() {
  const client = new ftp.Client(15000);
  client.ftp.ipFamily = 4;
  try {
    await client.access({
      host: "ftp.soretiinternational.com",
      port: 21,
      user: "rental@storage.soretiinternational.com",
      password: "CO$Ql]u#USHka~NU",
    });

    console.log("Connected successfully!");
    
    // Try to download .htaccess
    try {
      console.log("Downloading .htaccess...");
      await client.downloadTo("scratch/downloaded-htaccess.txt", ".htaccess");
      const content = fs.readFileSync("scratch/downloaded-htaccess.txt", "utf8");
      console.log(".htaccess content:");
      console.log(content);
    } catch (e) {
      console.log("No .htaccess found or download failed.");
    }

    // Try to download index.php or index.html to see what is serving the homepage
    try {
      console.log("Downloading index.php...");
      await client.downloadTo("scratch/downloaded-index.txt", "index.php");
      const content = fs.readFileSync("scratch/downloaded-index.txt", "utf8");
      console.log("index.php content:");
      console.log(content);
    } catch (e) {
      console.log("No index.php found in root.");
      try {
        console.log("Downloading index.html...");
        await client.downloadTo("scratch/downloaded-index.txt", "index.html");
        const content = fs.readFileSync("scratch/downloaded-index.txt", "utf8");
        console.log("index.html content:");
        console.log(content);
      } catch (err) {
        console.log("No index.html found in root.");
      }
    }

  } catch (err) {
    console.error("FTP Error:", err);
  } finally {
    client.close();
  }
}

run();
