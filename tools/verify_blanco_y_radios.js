// Verifica: palabras en blanco + tipografia Inter en el efecto, radios en 0, hero nuevo
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2] || 'http://localhost:8899/index.html';
  const foto = process.argv[3] || 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/ver_blanco_local.png';
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(7000);

  // esperar el sketch
  for (let i = 0; i < 30; i++) {
    const r = await page.evaluate(() => (typeof window.p5EffectReady === 'function' ? window.p5EffectReady() : false)).catch(() => false);
    if (r) break;
    await page.waitForTimeout(500);
  }

  const cfg = await page.evaluate(() => {
    const g = window.ParticlesConfig && window.ParticlesConfig.get ? window.ParticlesConfig.get() : {};
    return { COLOR_1: g.COLOR_1, COLOR_2: g.COLOR_2, P5_FONT: g.P5_FONT, FORCE_WHITE_WORDS: g.FORCE_WHITE_WORDS, interCargada: document.fonts ? document.fonts.check('600 16px Inter') : 'sin fonts API' };
  });
  console.log('CONFIG: ' + JSON.stringify(cfg));

  // click en zona vacia (hero) para generar palabras
  await page.mouse.move(300, 220);
  await page.mouse.click(300, 220);
  await page.waitForTimeout(400);
  await page.mouse.click(420, 260);
  await page.waitForTimeout(900);

  const pix = await page.evaluate(() => {
    const c = document.querySelector('#p5-canvas canvas') || document.querySelector('canvas');
    if (!c) return 'sin canvas';
    const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
    const cx = t.getContext('2d'); cx.drawImage(c, 0, 0);
    const d = cx.getImageData(0, 0, t.width, t.height).data;
    let blancos = 0, noBlancos = 0, maxR = 0, maxG = 0, maxB = 0, sumaR = 0, sumaG = 0, sumaB = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
      if (a < 20) continue;
      n++;
      sumaR += r; sumaG += g; sumaB += b;
      if (r > 235 && g > 235 && b > 235) blancos++;
      else noBlancos++;
      if (r > maxR) maxR = r; if (g > maxG) maxG = g; if (b > maxB) maxB = b;
    }
    return { pixelesConTinta: n, blancosPuros: blancos, otros: noBlancos, promedioRGB: n ? [Math.round(sumaR / n), Math.round(sumaG / n), Math.round(sumaB / n)] : null, maxRGB: [maxR, maxG, maxB] };
  });
  console.log('EFECTO: ' + JSON.stringify(pix));

  const est = await page.evaluate(() => {
    const r = el => el ? getComputedStyle(el).borderRadius : 'n/a';
    return {
      h1: (document.querySelector('.fk-hero h1') || {}).textContent,
      sub: (document.querySelector('.fk-hero p') || {}).textContent,
      radioCard: r(document.querySelector('.card-cyber')),
      radioBtnHeader: r(document.querySelector('.ui-btn')),
      radioNavlink: r(document.querySelector('.ui-navlink')),
      radioSeg: r(document.querySelector('.fk-seg')),
      radioPill: r(document.getElementById('filter-post')),
      radioHumano: r(document.getElementById('filter-human-ai')),
      radioExterna: r(document.getElementById('filter-external')),
      radioBotonesRedondeados: [...document.querySelectorAll('[class*="rounded"]')].filter(e => parseFloat(getComputedStyle(e).borderRadius) > 0).length,
    };
  });
  console.log('ESTILO: ' + JSON.stringify(est, null, 1));
  fs.writeFileSync(foto, await page.screenshot());
  await browser.close();
})();
