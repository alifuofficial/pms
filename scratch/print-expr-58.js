const fs = require('fs');

const content = fs.readFileSync('src/app/u/[slug]/page.tsx', 'utf8');

const regex = /\{[^{}]+\}/g;
let match;
let idx = 0;

while ((match = regex.exec(content)) !== null) {
  idx++;
  if (idx === 58) {
    const startIndex = match.index;
    const linesBefore = content.substring(0, startIndex).split('\n');
    const lineNum = linesBefore.length;
    console.log(`Expression #58 found on line ${lineNum}:`);
    console.log(`Line content: ${linesBefore[lineNum - 1] + match[0]}`);
    break;
  }
}
