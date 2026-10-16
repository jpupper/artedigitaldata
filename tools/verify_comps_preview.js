// Comprueba 4 composiciones del panel S: que cada preview dibuje algo (o explique por que no)
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  let glZero = 0;
  page.on('console', (m) => { if (/GL_INVALID_FRAMEBUFFER_OPERATION/.test(m.text())) glZero++; });

  await page.goto('https://artedigitaldata.com/?nc=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.JPShaderInclude.openPanel());
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('[data-tab="comps"]').click());
  await page.waitForTimeout(2500);

  const cajas = await page.evaluate(() => {
    const out = [];
    for (const card of document.querySelectorAll('#jpsi-grid .card')) {
      const th = card.querySelector('.thumb');
      const btn = card.querySelector('[data-apply]');
      if (!th || !btn) continue;
      const r = th.getBoundingClientRect();
      if (r.width < 10) continue;
      out.push({ x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), fuente: btn.getAttribute('data-apply') });
      if (out.length >= 4) break;
    }
    return out;
  });

  for (const c of cajas) {
    await page.mouse.move(c.x - 40, c.y - 40);
    await page.mouse.move(c.x, c.y);
    await page.waitForTimeout(2500);
    const pv = await page.evaluate(() => {
      const cc = document.getElementById('jpsi-prev-canvas');
      let brillo = null, max = null;
      if (cc && cc.style.display !== 'none' && cc.width > 0) {
        const t = document.createElement('canvas'); t.width = cc.width; t.height = cc.height;
        const cx = t.getContext('2d'); cx.drawImage(cc, 0, 0);
        const d = cx.getImageData(0, 0, t.width, t.height).data;
        let s = 0, m = 0;
        for (let i = 0; i < d.length; i += 4) { const v = d[i] + d[i + 1] + d[i + 2]; s += v; if (v > m) m = v; }
        brillo = +(s / (d.length / 4) / 3).toFixed(1); max = m;
      }
      return { nivel: brillo, maxRGB: max, st: window.JPShaderInclude.previewState() };
    });
    console.log(`${c.fuente}  pases=${pv.st.passes}  brilloMedio=${pv.nivel}  maxRGB=${pv.maxRGB}  err="${pv.st.err}"`);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
  }
  console.log('GL_INVALID_FRAMEBUFFER_OPERATION totales: ' + glZero);
  await browser.close();
})();
