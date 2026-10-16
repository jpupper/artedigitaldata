// Que pasa en las otras secciones: canvas presentes, z-index, fondos y lo que se VE
const { chromium } = require('playwright');

const PAGINAS = ['obras.html', 'recursos.html', 'eventos.html', 'oportunidades.html', 'profile.html?user=jpupper', 'artistas.html'];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  for (const p of PAGINAS) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.goto('https://artedigitaldata.com/' + p + (p.includes('?') ? '&' : '?') + 'nc=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(7000);
    const info = await page.evaluate(() => {
      const canv = [...document.querySelectorAll('canvas')].map(c => {
        const cs = getComputedStyle(c);
        return { id: c.id || '(sin id)', z: cs.zIndex, op: cs.opacity, bg: cs.backgroundColor, buf: c.width + 'x' + c.height, parentZ: c.parentElement ? getComputedStyle(c.parentElement).zIndex : null };
      });
      return {
        canvases: canv,
        htmlBg: getComputedStyle(document.documentElement).backgroundColor,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        include: typeof window.JPShaderInclude,
        asciiBG: typeof window.AsciiShaderBG,
      };
    });
    // lo que se ve en una zona "vacia" (arriba a la derecha)
    const png = await page.screenshot({ clip: { x: 1000, y: 120, width: 320, height: 120 } });
    const b64 = png.toString('base64');
    const vis = await page.evaluate(async (data) => {
      const img = new Image(); await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + data; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height).data;
      let s = 0; const hist = {};
      for (let i = 0; i < d.length; i += 4) { s += d[i] + d[i + 1] + d[i + 2]; const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2]; hist[k] = (hist[k] || 0) + 1; }
      const n = d.length / 4;
      const dom = Object.entries(hist).sort((a, b) => b[1] - a[1])[0];
      return { brillo: +(s / n / 3).toFixed(1), dominante: dom[0] + ' (' + Math.round(100 * dom[1] / n) + '%)' };
    }, b64);
    console.log(`\n${p}\n   canvas: ${JSON.stringify(info.canvases)}`);
    console.log(`   html=${info.htmlBg} body=${info.bodyBg} include=${info.include} AsciiShaderBG=${info.asciiBG}`);
    console.log(`   PANTALLA en zona vacia: ${JSON.stringify(vis)}`);
    await page.close();
  }
  await browser.close();
})();
