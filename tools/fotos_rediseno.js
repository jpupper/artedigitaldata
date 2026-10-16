// Capturas para trabajar el rediseño: home (con fondo) y una seccion interior
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const out = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
  const casos = [
    { url: 'https://artedigitaldata.com/?nc=' + Date.now(), archivo: 'dis_home_actual.png', espera: 9000 },
    { url: 'https://artedigitaldata.com/obras.html?nc=' + Date.now(), archivo: 'dis_obras_actual.png', espera: 7000 },
  ];
  for (const c of casos) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
    await page.goto(c.url, { waitUntil: 'load' });
    await page.waitForTimeout(c.espera);
    fs.writeFileSync(out + c.archivo, await page.screenshot());
    console.log('guardado ' + c.archivo);
    await page.close();
  }
  await browser.close();
})();
