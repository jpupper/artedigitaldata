// Verifica el flyer en distintos segundos de la timeline: fotos + palabras (px blancos)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const ID = process.argv[2] || '6aa84bda4931621eba633509';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const errs = [];
  for (const t of [2, 8, 11, 17, 72]) {
    const page = await browser.newPage({ viewport: { width: 420, height: 860 } });
    page.on('pageerror', (e) => errs.push(`t=${t}: ` + String(e).slice(0, 90)));
    await page.goto('https://artedigitaldata.com/flyer.html?id=' + ID + '&t=' + t + '&nc=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(11000);

    const png = await page.screenshot();
    const info = await page.evaluate(async (d) => {
      const img = new Image(); await new Promise((r) => { img.onload = r; img.src = 'data:image/png;base64,' + d; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
      const dd = cx.getImageData(0, 0, c.width, c.height).data;
      let claros = 0;
      for (let i = 0; i < dd.length; i += 4) if (dd[i] > 200 && dd[i + 1] > 200 && dd[i + 2] > 200) claros++;
      const obra = document.getElementById('fly-obra'), perfil = document.getElementById('fly-perfil');
      return {
        palabraPx: claros,
        obra: obra.classList.contains('is-in') ? (obra.getAttribute('src') || '').slice(-22) : 'no',
        perfil: perfil.classList.contains('is-in') ? (perfil.classList.contains('is-chico') ? 'chico' : 'grande') : 'no',
        barra: document.getElementById('fly-barra-fill').style.width,
      };
    }, png.toString('base64'));

    console.log(`t=${String(t).padStart(3)}s -> palabras=${String(info.palabraPx).padStart(6)}px | obra: ${info.obra} | perfil: ${info.perfil} | barra ${info.barra}`);
    fs.writeFileSync(OUT + 'flyf_' + t + '.png', png);
    await page.close();
  }
  console.log('errores JS:', errs.length, errs.slice(0, 2));
  await browser.close();
})();
