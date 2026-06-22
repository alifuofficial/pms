import pg from "pg";
const { Pool } = pg;
import Kenat from "kenat";

const toEthiopian = (date) => {
  const addisDate = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
  return new Kenat(addisDate).getEthiopian();
};

const getEthiopianMonthEnd = (date) => {
  const k = new Kenat(date);
  const lastDay = k.month === 13 ? (isEthiopianLeapYear(k.year) ? 6 : 5) : 30;
  const endEt = new Kenat({ year: k.year, month: k.month, day: lastDay });
  return endEt.getGregorian();
};

function isEthiopianLeapYear(year) {
  return (year + 1) % 4 === 0;
}

function getArrearMonths(leaseStart, payments) {
  const now = new Date();
  const arrears = [];
  
  const coveredMonthKeys = new Set();
  const approvedPayments = payments.filter(p => p.status === "APPROVED");
  
  for (const p of approvedPayments) {
    const startEt = toEthiopian(new Date(p.dueDate));
    const endEt = toEthiopian(p.advanceUntil ? new Date(p.advanceUntil) : new Date(p.dueDate));
    
    let tempYear = startEt.year;
    let tempMonth = startEt.month;
    let iterations = 0;
    while (iterations < 60) {
      coveredMonthKeys.add(`${tempYear}-${tempMonth}`);
      if (tempYear === endEt.year && tempMonth === endEt.month) break;
      tempMonth++;
      if (tempMonth > 13) { tempMonth = 1; tempYear++; }
      iterations++;
    }
  }

  const startEt = toEthiopian(leaseStart);
  const nowEt = toEthiopian(now);

  console.log("coveredMonthKeys:", Array.from(coveredMonthKeys));
  console.log("startEt:", startEt);
  console.log("nowEt:", nowEt);

  let tempYear = startEt.year;
  let tempMonth = startEt.month;
  let iterations = 0;
  
  while (iterations < 60) {
    const key = `${tempYear}-${tempMonth}`;
    
    if (!coveredMonthKeys.has(key)) {
      const etDateObj = new Kenat({ year: tempYear, month: tempMonth, day: 1 });
      const greg = etDateObj.getGregorian();
      arrears.push(new Date(Date.UTC(greg.year, greg.month - 1, greg.day, 12, 0, 0)));
    }
    
    if (tempYear === nowEt.year && tempMonth === nowEt.month) break;
    tempMonth++;
    if (tempMonth > 13) { tempMonth = 1; tempYear++; }
    iterations++;
  }

  return arrears;
}

const connectionString = "postgresql://postgres.sntmnsilbpgqohzpzzfi:%40mySupabase%40303@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function run() {
  const pool = new Pool({ connectionString });
  try {
    const leaseId = 'cmpm9bk9b003n2fnyz5ijyio2';
    const leaseRes = await pool.query('SELECT * FROM "Lease" WHERE id = $1;', [leaseId]);
    const lease = leaseRes.rows[0];
    
    const paymentsRes = await pool.query('SELECT * FROM "Payment" WHERE "leaseId" = $1 ORDER BY "dueDate" ASC;', [leaseId]);
    const payments = paymentsRes.rows;

    console.log("Lease Start Date:", lease.startDate);
    const arrears = getArrearMonths(new Date(lease.startDate), payments);
    console.log("Arrears:", arrears);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
