// Verifica exportación: video (canvas, sin shader) y PNG. Y que el link play siga andando en celu.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const p = await b.newPage({ viewport: { width: 420, height: 860 } });
  p.on('dialog', d => d.accept());
  await p.goto('https://artedigitaldata.com/flyer.html?proyecto=6acef4267e2dfebc537d3ddd&nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(9000);

  // PNG
  const dlPng = p.waitForEvent('download', { timeout: 40000 }).catch(() => null);
  await p.click('#fly-exportar');
  const png = await dlPng;
  if (png) {
    const r = OUT + 'export_' + png.suggestedFilename();
    await png.saveAs(r);
    console.log('PNG:', png.suggestedFilename(), fs.statSync(r).size, 'bytes');
  } else console.log('PNG: sin descarga');

  // VIDEO (lienzo compuesto, sin el shader)
  const dlVid = p.waitForEvent('download', { timeout: 120000 }).catch(() => null);
  await p.click('#fly-grabar');
  await p.waitForTimeout(11000);
  await p.click('#fly-grabar');
  await p.waitForTimeout(3000);
  const tam = await p.evaluate(() => window.__tamanoVideo || 0);
  const vid = await dlVid;
  console.log('video grabado:', tam, 'bytes');
  if (vid) {
    const r = OUT + 'export_' + vid.suggestedFilename();
    await vid.saveAs(r);
    console.log('VIDEO:', vid.suggestedFilename(), fs.statSync(r).size, 'bytes');
  } else console.log('VIDEO: sin descarga');
  await p.close();

  // celular con play
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const p2 = await ctx.newPage();
  const errs = [];
  p2.on('pageerror', e => errs.push(String(e).slice(0, 70)));
  await p2.goto('https://artedigitaldata.com/flyer.html?id=6aa84bda4931621eba633509&play=1&nc=' + Date.now(), { waitUntil: 'load' });
  await p2.waitForTimeout(14000);
  console.log('celu ?play=1:', JSON.stringify(await p2.evaluate(() => ({
    panelOculto: document.getElementById('fly-panel').classList.contains('is-oculto'),
    barra: document.getElementById('fly-barra-fill').style.width,
    obras: document.getElementById('fly-meta').textContent.slice(0, 30),
  }))), '| errores:', errs.length);
  await b.close();
})();
