// Reproduce / verifica el bug del preview del panel (S) del JP Shader Include:
//  - GL_INVALID_FRAMEBUFFER_OPERATION: glDrawArrays: Attachment has zero size
//  - WARN [jpshaderinclude] preview:   (vacio)
// Y comprueba que el fondo de la pagina se dibuja (pixeles no negros).
const { chromium } = require('playwright');

const URL_PAGINA = process.env.PAGINA || 'https://artedigitaldata.com/';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const t0 = Date.now();
  const log = (m) => console.log(`[${String(Date.now() - t0).padStart(6)}ms] ${m}`);

  let glZero = 0, prevWarn = 0, prevWarnVacio = 0;
  page.on('console', (m) => {
    const t = m.text();
    if (/GL_INVALID_FRAMEBUFFER_OPERATION/.test(t)) { glZero++; if (glZero <= 3) log('GL ERROR: ' + t.slice(0, 160)); }
    if (/jpshaderinclude\] preview:/.test(t)) {
      prevWarn++;
      if (/preview:\s*$/.test(t)) prevWarnVacio++;
      if (prevWarn <= 3) log('PREVIEW WARN: ' + JSON.stringify(t.slice(0, 120)));
    }
  });
  page.on('pageerror', (e) => log('PAGEERROR: ' + String(e).slice(0, 150)));

  await page.goto(URL_PAGINA + (URL_PAGINA.includes('?') ? '&' : '?') + 'nc=' + Date.now(), { waitUntil: 'load' });
  log('load ok');

  // esperar el fondo
  let st = null;
  for (let i = 0; i < 40; i++) {
    st = await page.evaluate(() => (window.JPShaderInclude && window.JPShaderInclude.state ? window.JPShaderInclude.state() : null)).catch(() => null);
    if (st && st.ready) break;
    await page.waitForTimeout(500);
  }
  log('estado fondo: ' + JSON.stringify(st));

  const pixFondo = await page.evaluate(() => {
    const c = document.querySelector('#jpsi-canvas');
    if (!c) return 'sin #jpsi-canvas';
    const t = document.createElement('canvas'); t.width = 200; t.height = 120;
    const cx = t.getContext('2d');
    cx.drawImage(c, 0, 0, t.width, t.height);
    const d = cx.getImageData(0, 0, t.width, t.height).data;
    let suma = 0, max = 0;
    for (let i = 0; i < d.length; i += 4) { const v = d[i] + d[i + 1] + d[i + 2]; suma += v; if (v > max) max = v; }
    return { buffer: c.width + 'x' + c.height, brilloMedio: +(suma / (d.length / 4) / 3).toFixed(2), maxRGB: max };
  });
  log('FONDO pixeles: ' + JSON.stringify(pixFondo));

  // abrir el panel y disparar el preview de la primera tarjeta
  const abierto = await page.evaluate(() => {
    if (!window.JPShaderInclude || !window.JPShaderInclude.openPanel) return 'sin API';
    window.JPShaderInclude.openPanel();
    return 'panel abierto';
  });
  log(abierto);

  let cards = 0;
  for (let i = 0; i < 30; i++) {
    cards = await page.evaluate(() => document.querySelectorAll('#jpsi-grid .card').length).catch(() => 0);
    if (cards > 0) break;
    await page.waitForTimeout(500);
  }
  log('tarjetas en el grid: ' + cards);

  if (cards > 0) {
    const box = await page.evaluate(() => {
      const card = document.querySelector('#jpsi-grid .card');
      const th = card && card.querySelector('.thumb');
      if (!th) return null;
      const r = th.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
    });
    log('thumb: ' + JSON.stringify(box));
    if (box && box.w > 0) {
      await page.mouse.move(box.x - 30, box.y - 30);
      await page.mouse.move(box.x, box.y);
      await page.waitForTimeout(3000);
      const pv = await page.evaluate(() => {
        const api = window.JPShaderInclude;
        const c = document.getElementById('jpsi-prev-canvas');
        let pix = null;
        if (c && c.style.display !== 'none' && c.width > 0) {
          const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
          const cx = t.getContext('2d');
          cx.drawImage(c, 0, 0);
          const d = cx.getImageData(0, 0, t.width, t.height).data;
          let suma = 0, max = 0;
          for (let i = 0; i < d.length; i += 4) { const v = d[i] + d[i + 1] + d[i + 2]; suma += v; if (v > max) max = v; }
          pix = { brilloMedio: +(suma / (d.length / 4) / 3).toFixed(2), maxRGB: max };
        }
        return { previewState: api.previewState ? api.previewState() : null, pixeles: pix };
      });
      log('PREVIEW: ' + JSON.stringify(pv));
    }
  }

  log(`TOTAL: GL_INVALID_FRAMEBUFFER_OPERATION=${glZero} | warns preview=${prevWarn} (vacios=${prevWarnVacio})`);
  console.log((glZero === 0 && prevWarnVacio === 0) ? 'VEREDICTO: OK' : 'VEREDICTO: FALLA');
  await browser.close();
})();
