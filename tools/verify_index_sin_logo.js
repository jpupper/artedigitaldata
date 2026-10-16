// Chequeo local del index sin el logo del hero
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text().slice(0, 120)); });

  await page.goto(process.argv[2] || 'http://localhost:8899/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(4000);

  const est = await page.evaluate(() => ({
    logoAura: !!document.getElementById('logo-aura-canvas'),
    logoImg: !!document.querySelector('.logo-pure-img'),
    sunStage: !!document.querySelector('.sun-stage'),
    orbitRing: !!document.querySelector('.orbit-ring'),
    solarSystem: !!document.getElementById('solar-system'),
    heroCta: (document.getElementById('hero-cta') || {}).textContent ? document.getElementById('hero-cta').textContent.trim().slice(0, 40) : '(vacio)',
    pills: [...document.querySelectorAll('button.feed-pill')].map(b => b.textContent.trim()),
    canvasP5: !!document.querySelector('#p5-canvas canvas') || document.querySelectorAll('canvas').length,
    canvases: [...document.querySelectorAll('canvas')].map(c => c.id || 'noid'),
    ctaVisible: (() => { const c = document.getElementById('hero-cta'); if (!c) return false; const r = c.getBoundingClientRect(); return r.height > 0; })(),
  }));
  console.log('ESTADO: ' + JSON.stringify(est, null, 1));
  console.log('ERRORES (' + errores.length + '):');
  errores.slice(0, 8).forEach(e => console.log('   ' + e));
  await page.screenshot({ path: 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/index_sin_logo_local.png' });
  await browser.close();
})();
