import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function run() {
  const pool = new Pool({ connectionString });
  try {
    const repairs = [
      { id: "cmpxza7xo002t2fnu443oqy14", advanceUntil: "2026-05-07T21:00:00.000Z", label: "Unit 113 First Payment" },
      { id: "cmpm9bk9t003o2fny6fahq9c4", advanceUntil: "2026-04-07T21:00:00.000Z", label: "Unit B01 First Payment" },
      { id: "cmpm8p9v1002m2fny7h2idi72", advanceUntil: "2026-05-07T21:00:00.000Z", label: "Unit GD11 First Payment" },
      { id: "cmq6nxzqh00302go0rl3knoa5", advanceUntil: "2026-06-06T21:00:00.000Z", label: "Unit B02 First Payment" },
      { id: "cmpm8ofeh002j2fnytu5p1xhz", advanceUntil: "2026-05-07T21:00:00.000Z", label: "Unit GD10 First Payment" },
      { id: "cmpxu6yty00212fnuoanifmin", advanceUntil: "2026-04-07T21:00:00.000Z", label: "Unit 009 First Payment" },
      { id: "cmq0y0gfp00372fnusad2dzzh", advanceUntil: "2026-07-06T21:00:00.000Z", label: "Unit 009 Second Payment" }
    ];

    console.log("Starting repairs...");
    for (const r of repairs) {
      console.log(`\nRepairing ${r.label} (ID: ${r.id})...`);
      
      const before = await pool.query('SELECT "advanceUntil" FROM "Payment" WHERE id = $1;', [r.id]);
      if (before.rows.length === 0) {
        console.log(`  Payment ${r.id} not found.`);
        continue;
      }
      
      console.log(`  Before advanceUntil: ${before.rows[0].advanceUntil ? before.rows[0].advanceUntil.toISOString() : 'null'}`);
      
      await pool.query('UPDATE "Payment" SET "advanceUntil" = $1 WHERE id = $2;', [r.advanceUntil, r.id]);
      
      const after = await pool.query('SELECT "advanceUntil" FROM "Payment" WHERE id = $1;', [r.id]);
      console.log(`  After advanceUntil:  ${after.rows[0].advanceUntil ? after.rows[0].advanceUntil.toISOString() : 'null'}`);
    }
    console.log("\nAll database repairs completed successfully!");
  } catch (err) {
    console.error("Error during repair:", err);
  } finally {
    await pool.end();
  }
}

run();
