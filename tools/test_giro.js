// ¿Las letras entran girando y se acomodan? Captura una ráfaga de cuadros tras spawnear.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const ID = '6aa84bda4931621eba633509';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const p = await b.newPage({ viewport: { width: 420, height: 860 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 90)));
  await p.goto('https://artedigitaldata.com/flyer.html?id=' + ID + '&t=40&nc=' + Date.now(), { waitUntil: 'load' });
  // espero a que p5 esté listo
  await p.waitForFunction(() => typeof window.textWidth === 'function' && typeof window.spawnWordParticles === 'function', { timeout: 20000 });
  await p.waitForTimeout(1500);

  // limpio y spawneo con giro, sin spin vs con spin (comparación)
  await p.evaluate(() => { window.clearAllFlyerParticles(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    window.spawnWordParticles('GIRANDO', 210, 300, true, 'g_con', { fontSize: 44, spin: true });
    window.spawnWordParticles('DERECHO', 210, 560, true, 'g_sin', { fontSize: 44 });
  });

  const capturas = [];
  for (const [ms, nombre] of [[150, 'a'], [330, 'b'], [520, 'c'], [800, 'd'], [2500, 'final']]) {
    await p.waitForTimeout(ms - (capturas.length ? [150, 330, 520, 800][capturas.length - 1] : 0));
    const png = await p.screenshot();
    fs.writeFileSync(OUT + 'giro_' + nombre + '.png', png);
    capturas.push(nombre);
  }
  console.log('capturas:', capturas.join(', '), '| errores:', errs.length, errs.slice(0, 2));
  await b.close();
})();
