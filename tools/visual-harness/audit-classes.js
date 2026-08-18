// Extrae el CSS que el Play CDN generó en vivo en cada página y verifica que
// el build estático lo cubra. Es la comprobación que las capturas no pueden
// hacer: el CDN genera clases a partir del DOM real, incluido el que arma el JS.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('./server');
const netcache = require('./netcache');
const PAGES = require('./pages');

async function main() {
  const { server, origin } = await start();
  const browser = await chromium.launch();

  const perPage = {};
  const allSelectors = new Set();

  for (const vp of [{ w: 1440, h: 900 }, { w: 390, h: 844 }]) {
    const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    await netcache.attach(context, { record: false });
    await context.addInitScript(() => {
      try { sessionStorage.setItem('fsc_sso_checked', 'true'); } catch {}
    });

    for (const p of PAGES) {
      const page = await context.newPage();
      try {
        await page.goto(`${origin}${p.url}`, { waitUntil: 'load', timeout: 45000 });
      } catch { /* seguimos con lo que haya renderizado */ }
      await page.waitForTimeout(3000);

      // El CDN inyecta su hoja como un <style> sin href.
      const selectors = await page.evaluate(() => {
        const out = [];
        for (const sheet of document.styleSheets) {
          const node = sheet.ownerNode;
          if (!node || node.tagName !== 'STYLE') continue;
          // Sólo la hoja del CDN: las páginas también traen <style> propios y
          // sus reglas no tienen nada que ver con Tailwind.
          if (!node.textContent.includes('--tw-ring-inset')) continue;
          let rules;
          try { rules = sheet.cssRules; } catch { continue; }
          const walk = (list) => {
            for (const r of list) {
              if (r.selectorText) out.push(r.selectorText);
              else if (r.cssRules) walk(r.cssRules);
            }
          };
          walk(rules);
        }
        return out;
      }).catch(() => []);

      perPage[`${p.name}@${vp.w}`] = selectors.length;
      selectors.forEach((s) => allSelectors.add(s));
      await page.close();
    }
    await context.close();
  }

  await browser.close();
  server.close();

  const out = path.resolve(__dirname, 'cdn-selectors.json');
  fs.writeFileSync(out, JSON.stringify({ perPage, selectors: [...allSelectors].sort() }, null, 2));
  console.log(`${allSelectors.size} selectores únicos generados por el CDN -> ${path.basename(out)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
