// Vuelca el estilo computado de cada elemento de una página.
//   node tools/visual-harness/computed-styles.js <ruta> <salida.json>
//   HARNESS_ROOT=... para apuntar a otra copia del sitio
//
// Sirve para verificar páginas que el diff de píxeles no puede juzgar, como
// 404.html, cuyo canvas de p5.js dibuja algo distinto en cada carga.
const fs = require('fs');
const { chromium } = require('playwright');
const { start } = require('./server');
const netcache = require('./netcache');

async function main() {
  const [urlPath, out] = process.argv.slice(2);
  if (!urlPath || !out) throw new Error('uso: computed-styles.js <ruta> <salida.json>');

  const { server, origin } = await start();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await netcache.attach(context, { record: false });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('fsc_sso_checked', 'true'); } catch {}
  });

  const page = await context.newPage();
  await page.goto(`${origin}${urlPath}`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(2500);

  const styles = await page.evaluate(() => {
    const out = [];
    const els = document.querySelectorAll('*');
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const cs = getComputedStyle(el);
      const props = {};
      for (let j = 0; j < cs.length; j++) {
        const name = cs[j];
        props[name] = cs.getPropertyValue(name);
      }
      // La ruta en el árbol identifica al elemento sin depender del contenido.
      const path = [];
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        path.unshift(`${n.tagName}:${[...(n.parentElement?.children || [])].indexOf(n)}`);
      }
      out.push({ el: path.join('>'), props });
    }
    return out;
  });

  await browser.close();
  server.close();
  fs.writeFileSync(out, JSON.stringify(styles, null, 2));
  console.log(`${styles.length} elementos -> ${out}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
