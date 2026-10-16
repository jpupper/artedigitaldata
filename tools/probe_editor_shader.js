const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errs = [];
  page.on('console', (m) => { if (/GL_INVALID|error|Error/.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 140)); });
  await page.goto('https://vps-4455523-x.dattaweb.com/jpshadereditor/shader.html?shader=sancarlopoliroso3', { waitUntil: 'load' });
  await page.waitForTimeout(9000);
  const info = await page.evaluate(() => {
    const canv = [...document.querySelectorAll('canvas')].map(c => {
      let brillo = null;
      try {
        const t = document.createElement('canvas'); t.width = 120; t.height = 68;
        const cx = t.getContext('2d'); cx.drawImage(c, 0, 0, t.width, t.height);
        const d = cx.getImageData(0, 0, t.width, t.height).data;
        let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
        brillo = +(s / (d.length / 4) / 3).toFixed(1);
      } catch (e) { brillo = 'err'; }
      return { id: c.id || '(sin id)', buffer: c.width + 'x' + c.height, css: Math.round(c.getBoundingClientRect().width) + 'x' + Math.round(c.getBoundingClientRect().height), brillo };
    });
    return {
      canvases: canv,
      errores: (window.renderer && window.renderer.onError) ? 'hay renderer' : 'sin window.renderer',
      usaRenderer: typeof window.WebGLRenderer,
      pases: (window.renderer && window.renderer.passes) ? window.renderer.passes.size : null,
      screen: (window.renderer && window.renderer.parameters) ? window.renderer.parameters.screenWidth + 'x' + window.renderer.parameters.screenHeight : null,
      displayPass: window.renderer ? window.renderer.displayPassId : null,
    };
  });
  console.log(JSON.stringify(info, null, 1));
  console.log('consola:', errs.slice(0, 5));
  await browser.close();
})();
