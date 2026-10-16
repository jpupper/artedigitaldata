const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1366, height: 940 } });
  page.on('response', (r) => { if (r.status() >= 400) console.log('HTTP ' + r.status() + ' ' + r.url().slice(0, 130)); });
  await page.goto('https://artedigitaldata.com/?nc=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/live_index_sin_logo.png' });
  const altura = await page.evaluate(() => ({ scroll: document.body.scrollHeight, hero: (document.getElementById('hero-cta') || {}).getBoundingClientRect ? document.getElementById('hero-cta').getBoundingClientRect().top : null }));
  console.log('altura/hero: ' + JSON.stringify(altura));
  await browser.close();
})();
