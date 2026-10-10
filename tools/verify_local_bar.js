const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const t0 = Date.now();
  const log = (m) => console.log(`[${String(Date.now() - t0).padStart(6)}ms] ${m}`);
  const errors = [];
  page.on('pageerror', (e) => { errors.push(String(e)); log('PAGEERROR: ' + String(e).slice(0, 200)); });
  page.on('console', (m) => { if (m.type() === 'error' && /floor|not defined/.test(m.text())) log('CONSOLE ERR: ' + m.text().slice(0, 200)); });

  await page.goto('http://localhost:8899/index.html', { waitUntil: 'domcontentloaded' });
  log('DOMContentLoaded');

  // CLICK TEMPRANO: antes de que p5 arranque (el bug original)
  await page.mouse.click(640, 780);
  await page.waitForTimeout(300);
  await page.mouse.click(500, 820);
  log('clicks tempranos hechos. errores hasta ahora: ' + errors.length);

  // esperar a que el sketch arranque
  let ready = false;
  for (let i = 0; i < 40; i++) {
    ready = await page.evaluate(() => (typeof window.p5EffectReady === 'function' ? window.p5EffectReady() : 'sin-fn')).catch(() => false);
    if (ready === true) break;
    await page.waitForTimeout(500);
  }
  log('sketchReady = ' + ready + ' (a los ' + (Date.now() - t0) + 'ms)');

  await page.mouse.click(640, 800);
  await page.waitForTimeout(800);
  const post = await page.evaluate(() => ({
    floor: typeof window.floor,
    canvases: [...document.querySelectorAll('canvas')].map(c => c.id || 'noid').join('|'),
    p5canvas: !!document.getElementById('p5-canvas'),
  }));
  log('post-click ' + JSON.stringify(post));

  // --- barra de filtros ---
  const bar = await page.evaluate(() => {
    const pills = [...document.querySelectorAll('button.feed-pill')];
    const barEl = pills.length ? pills[0].parentElement : null;
    return {
      labels: pills.map(b => (b.textContent || '').trim()),
      ids: pills.map(b => b.id),
      mismosIdsViejos: ['filter-post', 'filter-recurso', 'filter-oportunidad', 'filter-evento'].every(id => !!document.getElementById(id)),
      enLaMismaBarra: !!barEl && !!barEl.querySelector('#filter-human-ai') && !!barEl.querySelector('#filter-external'),
      moonPillRestantes: document.querySelectorAll('.moon-pill').length,
      orbitRotator: !!document.getElementById('orbit-rotator'),
      clasePill: pills.length ? pills[0].className : null,
      fondoActivo: pills.length ? getComputedStyle(pills[0]).backgroundColor + ' / ' + getComputedStyle(pills[0]).color : null,
    };
  });
  log('BARRA: ' + JSON.stringify(bar, null, 1));

  // toggleFilter funciona?
  const toggle = await page.evaluate(async () => {
    const b = document.getElementById('filter-post');
    const antes = b.classList.contains('active');
    b.click();
    await new Promise(r => setTimeout(r, 50));
    const despues = b.classList.contains('active');
    b.click();
    await new Promise(r => setTimeout(r, 50));
    return { antes, despues, restaurado: b.classList.contains('active'), activeFilters: JSON.stringify(window.activeFilters) };
  });
  log('TOGGLE: ' + JSON.stringify(toggle));

  await page.screenshot({ path: 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/local_index_bar.png', fullPage: false });
  log('errores totales: ' + errors.length);
  errors.forEach(e => log('  ERR ' + e.slice(0, 160)));
  await browser.close();
})();
