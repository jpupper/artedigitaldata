// Chequeo final del flyer: escena de obra en celular y en escritorio (que no se pise el texto)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const ID = '6aa84bda4931621eba633509';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const errs = [];
  for (const [w, h, nombre, t] of [[420, 860, 'celular_obra', 12], [390, 844, 'celular_artista', 7], [1440, 900, 'escritorio_obra', 12], [1440, 900, 'escritorio_cierre', 118]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', (e) => errs.push(nombre + ': ' + String(e).slice(0, 80)));
    await p.goto('https://artedigitaldata.com/flyer.html?id=' + ID + '&t=' + t + '&nc=' + Date.now(), { waitUntil: 'load' });
    await p.waitForTimeout(11000);
    const png = await p.screenshot();
    fs.writeFileSync(OUT + 'final_' + nombre + '.png', png);
    const info = await p.evaluate(() => ({
      meta: (document.getElementById('fly-meta') || {}).textContent,
      scrollX: document.documentElement.scrollWidth > window.innerWidth,
      obra: (document.getElementById('fly-obra') || {}).className,
      perfil: (document.getElementById('fly-perfil') || {}).className,
    }));
    console.log(nombre, w + 'x' + h, '|', info.meta, '| scroll horizontal:', info.scrollX);
    await p.close();
  }
  console.log('errores:', errs.length, errs.slice(0, 3));
  await b.close();
})();
