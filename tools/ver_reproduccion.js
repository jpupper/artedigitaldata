// Reproduce el proyecto guardado y captura varios momentos (con las fotos ya cargadas)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const ID = process.argv[2] || '6acef4267e2dfebc537d3ddd';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const p = await b.newPage({ viewport: { width: 420, height: 860 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 80)));
  await p.goto('https://artedigitaldata.com/flyer.html?proyecto=' + ID + '&nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(9000);
  // espero a que las imágenes del proyecto estén descargadas
  await p.waitForFunction(() => (window.activeImageLayers || []).length > 0 &&
    window.activeImageLayers.every(i => !i.imgElement || (i.imgElement.complete && i.imgElement.naturalWidth > 0)),
    { timeout: 60000 }).catch(() => console.log('  (aviso: no todas las imágenes terminaron de cargar)'));
  await p.click('#fly-play').catch(() => {});
  await p.waitForTimeout(2500);

  for (let k = 0; k < 5; k++) {
    const est = await p.evaluate(() => {
      const vis = (window.activeImageLayers || []).filter(i => i.visible !== false).map(i => i.name.split(':')[0] + ':' + (i.name.split(':')[1] || '').trim().slice(0, 18));
      return { vis, x: Math.round(window.activeImageLayers?.[0]?.x || 0), y: Math.round(window.activeImageLayers?.[0]?.y || 0) };
    });
    const png = await p.screenshot();
    fs.writeFileSync(OUT + 'rep_' + k + '.png', png);
    console.log('cap ' + k + ':', JSON.stringify(est.vis), '| x,y de la 1ª capa:', est.x, est.y);
    await p.waitForTimeout(6000);
  }
  console.log('errores:', errs.length, errs.slice(0, 2));
  await b.close();
})();
