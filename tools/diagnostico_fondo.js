// Diagnostico: por que el fondo del include no se ve en artedigitaldata.com
// Mide: estado del include, estilo/stacking de #jpsi-canvas, quien esta encima,
// y compara los pixeles del canvas del shader contra lo que realmente se ve en pantalla.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const log = (m) => console.log(m);
  const msgs = [];
  page.on('console', (m) => { const t = m.text(); if (/jpshaderinclude|GL_|error|Error|floor/.test(t)) msgs.push(m.type() + ': ' + t.slice(0, 170)); });
  page.on('pageerror', (e) => msgs.push('PAGEERROR: ' + String(e).slice(0, 170)));

  await page.goto('https://artedigitaldata.com/?nc=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(9000);

  const info = await page.evaluate(() => {
    const api = window.JPShaderInclude;
    const c = document.getElementById('jpsi-canvas');
    const cs = c ? getComputedStyle(c) : null;
    const p5 = document.querySelector('#p5-canvas canvas');
    const p5cs = p5 ? getComputedStyle(p5) : null;

    // quien esta arriba en el medio de la pantalla y en una zona "vacia"
    const puntos = { medio: [683, 450], arribaIzq: [120, 200] };
    const encima = {};
    for (const k in puntos) {
      encima[k] = document.elementsFromPoint(puntos[k][0], puntos[k][1]).slice(0, 6).map(e => ({
        tag: e.tagName, id: e.id || '', cls: String(e.className || '').slice(0, 45),
        z: getComputedStyle(e).zIndex, bg: getComputedStyle(e).backgroundColor, op: getComputedStyle(e).opacity, pos: getComputedStyle(e).position
      }));
    }

    // pixeles del canvas del shader
    function stats(el) {
      if (!el || !el.width) return null;
      try {
        const t = document.createElement('canvas'); t.width = 200; t.height = 120;
        const cx = t.getContext('2d'); cx.drawImage(el, 0, 0, t.width, t.height);
        const d = cx.getImageData(0, 0, t.width, t.height).data;
        let s = 0, max = 0, noNegro = 0, alphaProm = 0;
        for (let i = 0; i < d.length; i += 4) {
          const v = d[i] + d[i + 1] + d[i + 2]; s += v; if (v > max) max = v;
          if (v > 30) noNegro++;
          alphaProm += d[i + 3];
        }
        const n = d.length / 4;
        return { brillo: +(s / n / 3).toFixed(1), maxRGB: max, pctNoNegro: +(100 * noNegro / n).toFixed(1), alphaProm: Math.round(alphaProm / n) };
      } catch (e) { return 'error: ' + e.message; }
    }

    return {
      include_state: api && api.state ? api.state() : null,
      include_config: api && api.config ? api.config() : null,
      include_server: api && api.server ? api.server() : null,
      jpsiCanvas: c ? {
        buffer: c.width + 'x' + c.height, css: Math.round(c.getBoundingClientRect().width) + 'x' + Math.round(c.getBoundingClientRect().height),
        z: cs.zIndex, pos: cs.position, op: cs.opacity, bg: cs.backgroundColor, display: cs.display, vis: cs.visibility, mix: cs.mixBlendMode, inset: cs.top + '/' + cs.left, pointer: cs.pointerEvents,
      } : 'NO EXISTE #jpsi-canvas',
      p5Canvas: p5 ? { buffer: p5.width + 'x' + p5.height, z: p5cs.zIndex, pos: p5cs.position, op: p5cs.opacity, bg: p5cs.backgroundColor } : 'sin canvas p5',
      htmlBodyBg: { html: getComputedStyle(document.documentElement).backgroundColor, body: getComputedStyle(document.body).backgroundColor, main: getComputedStyle(document.querySelector('main')).backgroundColor },
      encimaDeEso: encima,
      pix_jpsi: stats(c),
      pix_p5: stats(p5),
    };
  });

  log(JSON.stringify(info, null, 1));

  // animacion: los pixeles del shader cambian con el tiempo?
  const a = await page.evaluate(() => {
    const c = document.getElementById('jpsi-canvas');
    const t = document.createElement('canvas'); t.width = 60; t.height = 40;
    const cx = t.getContext('2d'); cx.drawImage(c, 0, 0, t.width, t.height);
    return Array.from(cx.getImageData(0, 0, t.width, t.height).data.slice(0, 600));
  });
  await page.waitForTimeout(2000);
  const b = await page.evaluate(() => {
    const c = document.getElementById('jpsi-canvas');
    const t = document.createElement('canvas'); t.width = 60; t.height = 40;
    const cx = t.getContext('2d'); cx.drawImage(c, 0, 0, t.width, t.height);
    return Array.from(cx.getImageData(0, 0, t.width, t.height).data.slice(0, 600));
  });
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif += Math.abs(a[i] - b[i]);
  log('\nANIMACION del canvas del shader: suma de diferencias en 2s = ' + dif + (dif > 200 ? ' => ANIMA' : ' => CONGELADO/negro'));

  // que ve el usuario: brillo de una zona vacia del screenshot
  const shot = await page.screenshot();
  const sharpTmp = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/diag_artedigital.png';
  require('fs').writeFileSync(sharpTmp, shot);
  log('screenshot: ' + sharpTmp);
  log('\nCONSOLA (' + msgs.length + '):');
  msgs.slice(0, 12).forEach(m => log('   ' + m));
  await browser.close();
})();
