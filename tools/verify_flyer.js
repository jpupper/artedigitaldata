// Revisa el flyer animado en distintos segundos de la timeline (?t=) y saca fotos
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const ID = process.argv[2] || '6aa84bda4931621eba633509';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  // 9:16 para ver cómo queda el encuadre de Instagram
  const page = await browser.newPage({ viewport: { width: 420, height: 860 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 90)));
  await page.goto('https://artedigitaldata.com/flyer.html?id=' + ID + '&t=1&nc=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(9000);

  console.log('total escenas:', await page.evaluate(() => (window.escenasInfo ? '' : '')) || '(ok)');
  for (const t of [2, 8, 11, 18, 60]) {
    await page.evaluate((tt) => {
      // salta y fuerza el redibujo de la escena en ese segundo
      window.dispatchEvent(new CustomEvent('flyer-seek', { detail: tt }));
    }, t).catch(() => { });
    await page.goto('https://artedigitaldata.com/flyer.html?id=' + ID + '&t=' + t + '&nc=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(8500);
    const info = await page.evaluate(() => {
      const obra = document.getElementById('fly-obra');
      const perfil = document.getElementById('fly-perfil');
      return {
        obraVisible: obra.classList.contains('is-in'),
        obraSrc: obra.getAttribute('src') ? obra.getAttribute('src').slice(-28) : null,
        perfilVisible: perfil.classList.contains('is-in'),
        perfilChico: perfil.classList.contains('is-chico'),
        perfilSrc: document.getElementById('fly-perfil-img').getAttribute('src') ? document.getElementById('fly-perfil-img').getAttribute('src').slice(-24) : null,
        barra: (document.getElementById('fly-barra-fill').style.width || '0'),
        fondo: !!document.getElementById('jpsi-canvas'),
      };
    });
    console.log(`t=${String(t).padStart(3)}s -> ` + JSON.stringify(info));
    fs.writeFileSync(OUT + 'fly_' + t + '.png', await page.screenshot());
  }
  console.log('errores JS:', errs.length, errs.slice(0, 3));
  await browser.close();
})();
