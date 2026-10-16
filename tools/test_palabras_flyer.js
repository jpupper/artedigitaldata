// ¿Se dibujan palabras en flyer.html? Prueba directa con el sistema de partículas
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const ID = '6aa84bda4931621eba633509';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const p = await b.newPage({ viewport: { width: 420, height: 860 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 90)));
  await p.goto('https://artedigitaldata.com/flyer.html?id=' + ID + '&nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(8000);

  // 1) palabra en modo CODE (letras ya posicionadas) al centro
  const r1 = await p.evaluate(() => {
    try {
      window.spawnWordParticles('PRUEBA', 210, 430, true, 'test_code', { fontSize: 48, formationMode: 'CODE' });
      return 'spawn ok';
    } catch (e) { return 'error: ' + e.message; }
  });
  await p.waitForTimeout(2500);
  fs.writeFileSync(OUT + 'fly_prueba_code.png', await p.screenshot());
  const medir = async () => {
    const png = await p.screenshot();
    return await p.evaluate(async (d) => {
      const img = new Image(); await new Promise((r) => { img.onload = r; img.src = 'data:image/png;base64,' + d; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
      const dd = cx.getImageData(0, 0, c.width, c.height).data;
      let claros = 0;
      for (let i = 0; i < dd.length; i += 4) if (dd[i] > 200 && dd[i + 1] > 200 && dd[i + 2] > 200) claros++;
      return claros;
    }, png.toString('base64'));
  };
  console.log('spawn CODE:', r1, '| píxeles blancos:', await medir());

  // 2) AUTO_MODE: el sistema spawnea solo (palabras del pool)
  await p.evaluate(() => { window.ParticlesConfig.set({ AUTO_MODE: true, AUTO_INTERVAL_SEC: 1 }); });
  await p.waitForTimeout(7000);
  console.log('con AUTO_MODE, píxeles blancos:', await medir());
  fs.writeFileSync(OUT + 'fly_prueba_auto.png', await p.screenshot());

  console.log('errores:', errs.length, errs.slice(0, 3));
  await b.close();
})();
