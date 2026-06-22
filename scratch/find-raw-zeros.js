const fs = require('fs');

const content = fs.readFileSync('src/app/u/[slug]/page.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  // Find lines that have a '0' as a separate text token or inside a simple JSX block
  // e.g. <div>0</div> or just a lone 0
  const trimmed = line.trim();
  if (trimmed === '0' || trimmed.includes('>0<') || (trimmed.startsWith('{') && trimmed.endsWith('}') && trimmed.includes('0') && !trimmed.includes('?'))) {
    console.log(`${idx + 1}: ${trimmed}`);
  }
});
