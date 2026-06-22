const fs = require('fs');

const content = fs.readFileSync('src/app/u/[slug]/page.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  // Search for JSX expressions that could render a raw 0 (e.g. {someNumber} or {array.length && ...})
  const match = line.match(/\{[^}]+\}/g);
  if (match) {
    match.forEach(expr => {
      // Check if it's a potential 0 render
      if (expr.includes('length') || expr.includes('Count') || expr.includes('Balance') || expr.includes('Penalty') || expr.includes('Total')) {
        console.log(`${idx + 1}: ${line.trim()}  -->  Expr: ${expr}`);
      }
    });
  }
});
