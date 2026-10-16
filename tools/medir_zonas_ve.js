// Mide el brillo/color de varias zonas de visualeffects para saber si el fondo se ve
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('https://artedigitaldata.com/visualeffects.html?nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(9000);
  fs.writeFileSync(OUT + 've_full.png', await p.screenshot());

  const medir = async (x, y, w, h) => {
    const png = await p.screenshot({ clip: { x, y, width: w, height: h } });
    return await p.evaluate(async (d) => {
      const img = new Image();
      await new Promise((rr) => { img.onload = rr; img.src = 'data:image/png;base64,' + d; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
      const dd = cx.getImageData(0, 0, c.width, c.height).data;
      let s = 0, col = 0;
      const n = dd.length / 4;
      for (let i = 0; i < dd.length; i += 4) {
        s += dd[i] + dd[i + 1] + dd[i + 2];
        if (Math.max(dd[i], dd[i + 1], dd[i + 2]) - Math.min(dd[i], dd[i + 1], dd[i + 2]) > 14) col++;
      }
      return { brillo: +(s / n / 3).toFixed(1), pct: +(100 * col / n).toFixed(1) };
    }, png.toString('base64'));
  };

  for (const [x, y, w, h] of [[80, 560, 320, 300], [560, 720, 420, 160], [180, 120, 520, 180], [1100, 400, 300, 300]]) {
    const r = await medir(x, y, w, h);
    console.log(`zona ${x},${y} ${w}x${h} -> brillo ${r.brillo} | color ${r.pct}%`);
  }
  await b.close();
})();
