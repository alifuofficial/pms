const d = new Date('2026-03-09T18:00:00.000Z');
const str = d.toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' });
console.log("toLocaleString:", JSON.stringify(str));
console.log("parsed:", new Date(str).toString());
