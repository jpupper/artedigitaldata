// Prueba el preview del panel S en las 3 pestañas (shaders / composiciones / performance):
// composiciones y performance usan VARIOS pases con feedback (ping-pong), que es
// donde aparecian los targets 0x0.
const { chromium } = require('playwright');
const URL_PAGINA = process.env.PAGINA || 'https://artedigitaldata.com/';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const log = (m) => console.log(m);

  let glZero = 0, prevVacios = 0, prevTotal = 0;
  page.on('console', (m) => {
    const t = m.text();
    if (/GL_INVALID_FRAMEBUFFER_OPERATION/.test(t)) glZero++;
    if (/jpshaderinclude\] preview:/.test(t)) { prevTotal++; if (/preview:\s*$/.test(t)) prevVacios++; }
  });

  await page.goto(URL_PAGINA + (URL_PAGINA.includes('?') ? '&' : '?') + 'nc=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.JPShaderInclude && window.JPShaderInclude.openPanel());
  await page.waitForTimeout(1500);

  const pestañas = ['shaders', 'comps', 'perf'];
  for (const tab of pestañas) {
    const cambió = await page.evaluate((tb) => {
      const b = document.querySelector('[data-tab="' + tb + '"]');
      if (!b) return false;
      b.click();
      return true;
    }, tab);
    if (!cambió) { log(`--- ${tab}: no hay pestaña`); continue; }
    await page.waitForTimeout(2500);

    const n = await page.evaluate(() => document.querySelectorAll('#jpsi-grid .card').length);
    const glAntes = glZero, vaciosAntes = prevVacios;
    log(`--- ${tab}: ${n} tarjetas`);

    if (!n) { log(`    (sin tarjetas, se saltea)`); continue; }

    const box = await page.evaluate(() => {
      for (const card of document.querySelectorAll('#jpsi-grid .card')) {
        const th = card.querySelector('.thumb');
        const btn = card.querySelector('[data-apply]');
        if (!th || !btn) continue;
        const r = th.getBoundingClientRect();
        if (r.width > 10 && r.height > 10) {
          return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height), fuente: btn.getAttribute('data-apply') };
        }
      }
      return null;
    });
    if (!box) { log('    sin tarjeta con tamaño'); continue; }

    await page.mouse.move(box.x - 40, box.y - 40);
    await page.mouse.move(box.x, box.y);
    await page.waitForTimeout(2500);

    const pv = await page.evaluate(() => {
      const c = document.getElementById('jpsi-prev-canvas');
      let pix = null;
      if (c && c.style.display !== 'none' && c.width > 0) {
        const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
        const cx = t.getContext('2d');
        cx.drawImage(c, 0, 0);
        const d = cx.getImageData(0, 0, t.width, t.height).data;
        let suma = 0, max = 0;
        for (let i = 0; i < d.length; i += 4) { const v = d[i] + d[i + 1] + d[i + 2]; suma += v; if (v > max) max = v; }
        pix = { brilloMedio: +(suma / (d.length / 4) / 3).toFixed(2), maxRGB: max, buffer: c.width + 'x' + c.height };
      }
      return { previewState: window.JPShaderInclude.previewState(), pixeles: pix };
    });

    log(`    fuente=${box.fuente} preview=${JSON.stringify(pv.previewState)}`);
    log(`    pixeles del preview = ${JSON.stringify(pv.pixeles)}`);
    log(`    GL_INVALID_FRAMEBUFFER_OPERATION nuevos = ${glZero - glAntes} | warns preview vacios nuevos = ${prevVacios - vaciosAntes}`);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(400);
  }

  log('');
  log(`TOTAL: GL_INVALID_FRAMEBUFFER_OPERATION=${glZero} | warns preview=${prevTotal} (vacios=${prevVacios})`);
  console.log((glZero === 0 && prevVacios === 0) ? 'VEREDICTO: OK' : 'VEREDICTO: FALLA');
  await browser.close();
})();
