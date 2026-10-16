const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  await page.goto('file:///C:/Users/JPupper/AppData/Local/hermes/cache/scratch/variantes-home.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  for (const v of ['A', 'B', 'C']) {
    await page.click(`.switcher button[data-v="${v}"]`);
    await page.waitForTimeout(900);
    const out = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/variante_' + v + '.png';
    fs.writeFileSync(out, await page.screenshot({ fullPage: true }));
    console.log('guardado ' + out);
  }
  await browser.close();
})();
