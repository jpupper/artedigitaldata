// Compara los selectores que el Play CDN generaba en vivo contra los del build
// estático. Cualquier selector del CDN que falte es una clase que dejaría de
// aplicarse en producción.
//
// Los dos lados se normalizan con el MISMO motor (el del navegador): comparar
// el texto del CSS minificado contra el `selectorText` que devuelve el DOM da
// falsos positivos por espacios en los combinadores y por el escapado de
// comas dentro de `rgba(...)`.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const cdn = require('./cdn-selectors.json').selectors;
const CSS = path.resolve(__dirname, '../../public/css/tailwind.css');

function flatten(list) {
  const out = new Set();
  for (const sel of list) {
    // selectorText agrupa con comas; las partes se comparan de a una.
    for (const part of sel.split(/,(?![^[]*\])(?![^(]*\))/)) {
      const p = part.replace(/\s+/g, ' ').trim();
      if (p) out.add(p);
    }
  }
  return out;
}

async function main() {
  const css = fs.readFileSync(CSS, 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const builtRaw = await page.evaluate((text) => {
    const style = document.createElement('style');
    style.textContent = text;
    document.head.appendChild(style);
    const out = [];
    const walk = (rules) => {
      for (const r of rules) {
        if (r.selectorText) out.push(r.selectorText);
        else if (r.cssRules) walk(r.cssRules);
      }
    };
    walk(style.sheet.cssRules);
    return out;
  }, css);

  await browser.close();

  const built = flatten(builtRaw);
  const wanted = flatten(cdn);
  const missing = [...wanted].filter((s) => !built.has(s)).sort();

  console.log(`CDN: ${wanted.size} selectores | build: ${built.size} selectores`);
  if (missing.length === 0) {
    console.log('✓ El build cubre todos los selectores que generaba el CDN');
  } else {
    console.log(`✗ faltan ${missing.length}:\n`);
    missing.forEach((s) => console.log('   ' + s));
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
