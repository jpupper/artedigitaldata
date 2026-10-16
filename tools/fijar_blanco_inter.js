// Fija en la CONFIG DEL SERVIDOR: palabras blancas + tipografia del front (Inter).
// Así lo toman todas las páginas y el editor, no solo la home.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://artedigitaldata.com/?nc=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(7000);

  const res = await page.evaluate(async () => {
    window.ParticlesConfig.set({
      P5_FONT: 'Inter, system-ui, sans-serif',
      COLOR_1: '#ffffff', COLOR_2: '#ffffff', COLOR_3: '#ffffff', COLOR_4: '#ffffff',
      FORCE_WHITE_WORDS: true,
    });
    const r = await window.ParticlesConfig.save();
    const g = window.ParticlesConfig.get();
    return { guardado: r && r.ok, status: r && r.status, cfg: { P5_FONT: g.P5_FONT, COLOR_1: g.COLOR_1, COLOR_2: g.COLOR_2, FORCE_WHITE_WORDS: g.FORCE_WHITE_WORDS } };
  });
  console.log('SET+SAVE: ' + JSON.stringify(res));

  // verificar que quedó guardado: recargar y leer
  await page.goto('https://artedigitaldata.com/?nc=' + Date.now() + '2', { waitUntil: 'load' });
  await page.waitForTimeout(8000);
  const cfg = await page.evaluate(() => {
    const g = window.ParticlesConfig.get();
    return { P5_FONT: g.P5_FONT, COLOR_1: g.COLOR_1, COLOR_4: g.COLOR_4, FORCE_WHITE_WORDS: g.FORCE_WHITE_WORDS, inter: document.fonts.check('600 16px Inter') };
  });
  console.log('CFG TRAS RECARGA: ' + JSON.stringify(cfg));

  // medir el color de los pixeles que dibuja el efecto (alpha tenido en cuenta)
  for (let i = 0; i < 30; i++) {
    const r = await page.evaluate(() => (typeof window.p5EffectReady === 'function' ? window.p5EffectReady() : false)).catch(() => false);
    if (r) break;
    await page.waitForTimeout(500);
  }
  await page.mouse.move(280, 200); await page.mouse.click(280, 200);
  await page.waitForTimeout(500);
  await page.mouse.click(420, 250);
  await page.waitForTimeout(1200);

  const pix = await page.evaluate(() => {
    const c = document.querySelector('#p5-canvas canvas');
    const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
    const cx = t.getContext('2d'); cx.drawImage(c, 0, 0);
    const d = cx.getImageData(0, 0, t.width, t.height).data;
    let conTinta = 0, neutros = 0, coloridos = 0, maxDif = 0, maxV = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
      if (a < 24) continue;
      conTinta++;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dif = mx - mn;
      if (dif > maxDif) maxDif = dif;
      if (mx > maxV) maxV = mx;
      if (dif <= 10) neutros++; else coloridos++;
    }
    return { conTinta, neutros, coloridos, diferenciaMaximaRGB: maxDif, valorMaximo: maxV };
  });
  console.log('PIXELES DEL EFECTO: ' + JSON.stringify(pix));
  console.log(pix.coloridos === 0 && pix.conTinta > 50 ? 'VEREDICTO: las palabras se dibujan en blanco ✓' : 'VEREDICTO: revisar (hay pixeles con color)');
  await browser.close();
})();
