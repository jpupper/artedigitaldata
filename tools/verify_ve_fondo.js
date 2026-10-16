// Verifica que visualeffects.html levante el fondo del JP Shader Editor
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 80)));
  await page.goto('https://artedigitaldata.com/visualeffects.html?nc=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(9000);

  const info = await page.evaluate(() => {
    const jc = document.getElementById('jpsi-canvas');
    const cs = jc ? getComputedStyle(jc) : null;
    const st = (window.JPShaderInclude && window.JPShaderInclude.state) ? window.JPShaderInclude.state() : {};
    return {
      canvas: !!jc,
      tamano: jc ? jc.width + 'x' + jc.height : '-',
      zIndex: cs ? cs.zIndex : null,
      opacidad: cs ? cs.opacity : null,
      fondoListo: st.ready === undefined ? null : st.ready,
      queFondo: st.valor || st.comp || null,
      htmlBg: getComputedStyle(document.documentElement).backgroundColor,
      bodyBg: getComputedStyle(document.body).backgroundColor,
    };
  });

  const png = await page.screenshot({ clip: { x: 1150, y: 120, width: 240, height: 120 } });
  const pix = await page.evaluate(async (data) => {
    const img = new Image();
    await new Promise((r) => { img.onload = r; img.src = 'data:image/png;base64,' + data; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, c.width, c.height).data;
    let s = 0, col = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      s += d[i] + d[i + 1] + d[i + 2];
      if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 12) col++;
    }
    return { brillo: +(s / n / 3).toFixed(1), pctColor: +(100 * col / n).toFixed(1) };
  }, png.toString('base64'));

  console.log(JSON.stringify(info, null, 1));
  console.log('pantalla (zona sin UI):', JSON.stringify(pix), '| errores JS:', errs.length);
  const seVe = info.canvas && info.fondoListo && (pix.pctColor > 2 || pix.brillo > 25);
  console.log(seVe ? '✅ EL FONDO SE VE' : '⚠️  el fondo no se ve');
  fs.writeFileSync(OUT + 've_fondo.png', await page.screenshot({ clip: { x: 700, y: 0, width: 740, height: 420 } }));
  await browser.close();
})();
