// Compara dos volcados de computed-styles.js.
//   node tools/visual-harness/compare-styles.js a.json b.json
const fs = require('fs');

const [A, B] = process.argv.slice(2);
const a = JSON.parse(fs.readFileSync(A, 'utf8'));
const b = JSON.parse(fs.readFileSync(B, 'utf8'));

if (a.length !== b.length) {
  console.log(`✗ distinta cantidad de elementos: ${a.length} vs ${b.length}`);
  process.exit(1);
}

const diffs = [];
for (let i = 0; i < a.length; i++) {
  if (a[i].el !== b[i].el) { diffs.push(`${i}: elemento distinto ${a[i].el} vs ${b[i].el}`); continue; }
  for (const k of Object.keys(a[i].props)) {
    if (a[i].props[k] !== b[i].props[k]) {
      diffs.push(`${a[i].el}  ${k}: "${a[i].props[k]}" -> "${b[i].props[k]}"`);
    }
  }
}

console.log(`${a.length} elementos comparados`);
if (!diffs.length) console.log('✓ estilos computados idénticos');
else { console.log(`✗ ${diffs.length} diferencias:\n`); diffs.slice(0, 40).forEach((d) => console.log('   ' + d)); process.exitCode = 1; }
