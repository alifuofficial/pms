const fs = require('fs');

const content = fs.readFileSync('src/app/u/[slug]/page.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('arrearsCount')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
