// Smoke test del EDITOR (comparte webglrenderer.js): que el fix no rompa shader.html / nodeeditor.html
const { chromium } = require('playwright');

const PAGINAS = [
  'https://vps-4455523-x.dattaweb.com/jpshadereditor/shader.html?shader=sancarlopoliroso3',
  'https://vps-4455523-x.dattaweb.com/jpshadereditor/nodeeditor.html?comp=artedigital-ascii',
  'https://artedigitaldata.com/',
];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  for (const url of PAGINAS) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    let glErr = 0, jsErr = 0;
    page.on('console', (m) => {
      const t = m.text();
      if (/GL_INVALID_FRAMEBUFFER_OPERATION/.test(t)) glErr++;
      if (m.type() === 'error' && /is not defined|TypeError|is not a function|Cannot read/.test(t)) { jsErr++; if (jsErr <= 2) console.log('   JS: ' + t.slice(0, 140)); }
    });
    page.on('pageerror', (e) => { jsErr++; if (jsErr <= 2) console.log('   PAGEERROR: ' + String(e).slice(0, 140)); });

    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(8000);

    const info = await page.evaluate(() => {
      const canv = [...document.querySelectorAll('canvas')];
      let brillo = null, buffer = null;
      const c = canv.map(x => x).sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
      if (c && c.width > 0) {
        try {
          const t = document.createElement('canvas'); t.width = 160; t.height = 90;
          const cx = t.getContext('2d'); cx.drawImage(c, 0, 0, t.width, t.height);
          const d = cx.getImageData(0, 0, t.width, t.height).data;
          let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
          brillo = +(s / (d.length / 4) / 3).toFixed(1);
          buffer = c.width + 'x' + c.height + (c.id ? '#' + c.id : '');
        } catch (e) { brillo = 'no se pudo leer'; }
      }
      return {
        titulo: document.title.slice(0, 40),
        canvas: canv.length, mayorBuffer: buffer, brilloMedio: brillo,
        include: !!(window.JPShaderInclude && window.JPShaderInclude.state && window.JPShaderInclude.state().ready),
      };
    });
    console.log(`\n${url.slice(0, 78)}`);
    console.log(`   ${JSON.stringify(info)}  | GL_INVALID_FRAMEBUFFER=${glErr} | errores JS=${jsErr}`);
    await page.close();
  }
  await browser.close();
})();
