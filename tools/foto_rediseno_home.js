const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const url = process.argv[2] || 'http://localhost:8899/index.html';
  const out = process.argv[3] || 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/rediseno_home.png';
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/CORS|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 120)); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(9000);
  fs.writeFileSync(out, await page.screenshot());
  const est = await page.evaluate(() => ({
    cssCargado: [...document.styleSheets].some(s => (s.href || '').includes('fondo-ui.css')),
    seg: document.querySelectorAll('.fk-seg .filter-switch').length,
    toolbar: !!document.querySelector('.fk-toolbar'),
    hero: !!document.querySelector('.fk-hero h1'),
    h1: (document.querySelector('.fk-hero h1') || {}).textContent,
    cta: (document.getElementById('hero-cta') || {}).textContent ? document.getElementById('hero-cta').textContent.trim() : '',
    cards: document.querySelectorAll('.card-cyber').length,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    radioCard: (() => { const c = document.querySelector('.card-cyber'); return c ? getComputedStyle(c).borderRadius + ' / ' + getComputedStyle(c).backgroundColor : 'sin tarjetas'; })(),
    pillColor: (() => { const b = document.getElementById('filter-post'); return b ? getComputedStyle(b).color + ' | before:' + getComputedStyle(b, '::before').backgroundColor : 'sin pill'; })(),
  }));
  console.log(JSON.stringify(est, null, 1));
  console.log('errores JS: ' + errs.length); errs.slice(0, 5).forEach(e => console.log('  ' + e));
  await browser.close();
})();
