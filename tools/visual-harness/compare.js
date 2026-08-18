// Compara dos carpetas de snapshots pixel a pixel y escribe imágenes de diff.
//   node tools/visual-harness/compare.js before after
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const SNAP = path.resolve(__dirname, 'snapshots');
const PAGES = require('./pages');

// Páginas cuyo render es aleatorio por diseño: se informan aparte para que su
// ruido no se confunda con una regresión.
const NOISY = new Set(PAGES.filter((p) => p.nondeterministic).map((p) => p.name));

function read(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function main() {
  const [a, b] = [process.argv[2] || 'before', process.argv[3] || 'after'];
  const dirA = path.join(SNAP, a);
  const dirB = path.join(SNAP, b);
  const diffDir = path.join(SNAP, `diff-${a}-${b}`);
  fs.rmSync(diffDir, { recursive: true, force: true });
  fs.mkdirSync(diffDir, { recursive: true });

  const files = fs.readdirSync(dirA).filter((f) => f.endsWith('.png')).sort();
  const rows = [];

  for (const f of files) {
    const fileB = path.join(dirB, f);
    if (!fs.existsSync(fileB)) {
      rows.push({ file: f, status: 'FALTA en ' + b });
      continue;
    }
    const imgA = read(path.join(dirA, f));
    const imgB = read(fileB);

    if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
      rows.push({
        file: f,
        status: 'TAMAÑO',
        detail: `${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height}`,
      });
      continue;
    }

    const diff = new PNG({ width: imgA.width, height: imgA.height });
    const n = pixelmatch(imgA.data, imgB.data, diff.data, imgA.width, imgA.height, {
      threshold: 0.1,
      includeAA: false,
    });
    const total = imgA.width * imgA.height;
    const pct = (n / total) * 100;

    if (n > 0) {
      fs.writeFileSync(path.join(diffDir, f), PNG.sync.write(diff));
      const noisy = NOISY.has(f.split('--')[0]);
      rows.push({ file: f, status: noisy ? 'RUIDO' : 'DIFF', pixels: n, pct: pct.toFixed(4) });
    } else {
      rows.push({ file: f, status: 'OK' });
    }
  }

  const bad = rows.filter((r) => r.status !== 'OK' && r.status !== 'RUIDO');
  for (const r of rows) {
    if (r.status === 'OK') continue;
    console.log(`  ${r.status.padEnd(6)} ${r.file} ${r.pixels ? `${r.pixels}px (${r.pct}%)` : (r.detail || '')}`);
  }

  const noise = rows.filter((r) => r.status === 'RUIDO').length;
  console.log(`\n${rows.filter((r) => r.status === 'OK').length}/${rows.length} idénticos` +
    (noise ? ` (+${noise} con ruido conocido, ignorados)` : ''));
  if (bad.length) {
    console.log(`diffs en snapshots/diff-${a}-${b}/`);
    process.exitCode = 1;
  }
  fs.writeFileSync(path.join(diffDir, '_report.json'), JSON.stringify(rows, null, 2));
}

main();
