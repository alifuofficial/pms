const ftp = require("basic-ftp");

async function run() {
  const client = new ftp.Client(15000);
  client.ftp.ipFamily = 4;
  client.ftp.verbose = true;
  try {
    await client.access({
      host: "ftp.soretiinternational.com",
      port: 21,
      user: "rental@storage.soretiinternational.com",
      password: ")1V9yU%yXUbPis6O",
    });

    console.log("Connected successfully! Listing root directory...");
    const list = await client.list();
    console.log("Files and directories in root:");
    console.log(list.map(f => `${f.type === 2 ? 'DIR' : 'FILE'}: ${f.name} (size: ${f.size})`));

    // Try listing any directory found
    for (const item of list) {
      if (item.type === 2) {
        console.log(`\nListing contents of directory: ${item.name}`);
        try {
          await client.cd(item.name);
          const subList = await client.list();
          console.log(subList.map(f => `${f.type === 2 ? 'DIR' : 'FILE'}: ${f.name} (size: ${f.size})`));
          await client.cd("..");
        } catch (e) {
          console.log(`Error listing ${item.name}:`, e.message);
        }
      }
    }
  } catch (err) {
    console.error("FTP Error:", err);
  } finally {
    client.close();
  }
}

run();
