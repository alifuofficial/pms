async function run() {
  console.log("Checking verify.et status...");
  try {
    const response = await fetch("https://verify.et/health/live");
    console.log("Health Live Status:", response.status, response.statusText);
    const text = await response.text();
    console.log("Health Live response:", text);

    const responseExamples = await fetch("https://verify.et/api/examples");
    console.log("API Examples Status:", responseExamples.status, responseExamples.statusText);
    const textExamples = await responseExamples.text();
    console.log("API Examples length:", textExamples.length);

  } catch (err) {
    console.error("Fetch error:", err);
  }
}
run();
