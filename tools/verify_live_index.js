// Verificacion EN VIVO de artedigitaldata.com (index)
// - clicks/movimientos ANTES de que p5 arranque (el escenario del bug: floor is not defined)
// - barra de filtros con Obras/Recursos/Chances/Eventos al lado de humano-IA + Data Externa
// - despues de que el sketch arranca, el click spawnea una palabra (getWordIndex cambia)
// Los eventos se despachan sobre zonas vacias del hero para NO navegar a otra pagina.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const t0 = Date.now();
  const log = (m) => console.log(`[${String(Date.now() - t0).padStart(6)}ms] ${m}`);
  const scopeErrors = [];
  page.on('pageerror', (e) => {
    const s = String(e);
    if (/floor|not defined|ReferenceError/.test(s)) { scopeErrors.push(s); log('PAGEERROR: ' + s.slice(0, 180)); }
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && /floor|is not defined/.test(m.text())) { scopeErrors.push(m.text()); log('CONSOLE ERR: ' + m.text().slice(0, 180)); }
  });

  await page.goto('https://artedigitaldata.com/?nocache=' + Date.now(), { waitUntil: 'domcontentloaded' });
  // auth.js redirige a ?nosession=true: esperar a que se asiente antes de tocar el DOM
  for (let i = 0; i < 40; i++) {
    if (/nosession=true/.test(page.url())) break;
    await page.waitForTimeout(200);
  }
  log('asentado en ' + (await page.evaluate(() => location.pathname + location.search)).slice(0, 60));

  // --- clicks + movimientos ANTES de p5 (eventos despachados: mismo listener window) ---
  const disparos = await page.evaluate(() => {
    const puntos = [[640, 180], [300, 250], [980, 300], [640, 120]];
    let n = 0;
    for (const [x, y] of puntos) {
      for (const tipo of ['pointermove', 'pointerdown', 'pointerup']) {
        const ev = new PointerEvent(tipo, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true });
        document.body.dispatchEvent(ev);
        n++;
      }
    }
    return { disparados: n, p5EffectReady: typeof window.p5EffectReady === 'function' ? window.p5EffectReady() : 'sin fn', floor: typeof window.floor };
  });
  log('PRE-SKETCH: ' + JSON.stringify(disparos));
  await page.waitForTimeout(400);
  log('errores de scope tras clicks tempranos: ' + scopeErrors.length + ' | sigue en ' + (await page.evaluate(() => location.pathname)));

  // --- esperar el sketch ---
  let ready = null;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => (typeof window.p5EffectReady === 'function' ? window.p5EffectReady() : 'sin-fn')).catch(() => 'ctx');
    if (ready === true) break;
    await page.waitForTimeout(500);
  }
  log('sketchReady = ' + ready + ' a los ' + (Date.now() - t0) + 'ms');

  // --- click real en zona vacia del hero: tiene que spawnear palabra ---
  const idxAntes = await page.evaluate(() => (typeof window.getWordIndex === 'function' ? window.getWordIndex() : null));
  await page.mouse.move(250, 200);
  await page.mouse.click(250, 200);
  await page.waitForTimeout(600);
  const idxDespues = await page.evaluate(() => (typeof window.getWordIndex === 'function' ? window.getWordIndex() : null));
  log(`getWordIndex antes=${idxAntes} despues=${idxDespues} -> ${idxAntes !== idxDespues ? 'SPAWN OK' : 'no cambio'}`);

  const est = await page.evaluate(() => {
    const pills = [...document.querySelectorAll('button.feed-pill')];
    const bar = pills.length ? pills[0].parentElement : null;
    return {
      href: location.pathname + location.search,
      p5Script: [...document.querySelectorAll('script[src*="p5-effect"]')].map(s => s.getAttribute('src')).join(','),
      p5EffectReady: typeof window.p5EffectReady === 'function' ? window.p5EffectReady() : 'sin fn',
      floor: typeof window.floor,
      canvases: [...document.querySelectorAll('canvas')].map(c => c.id || 'noid').join('|'),
      pills: pills.map(b => (b.textContent || '').trim()),
      ids: pills.map(b => b.id),
      enLaMismaBarra: !!bar && !!bar.querySelector('#filter-human-ai') && !!bar.querySelector('#filter-external'),
      moonPills: document.querySelectorAll('.moon-pill').length,
      orbitRotator: !!document.getElementById('orbit-rotator'),
      colorObras: pills.length ? getComputedStyle(document.getElementById('filter-post')).color : null,
    };
  });
  log('ESTADO LIVE: ' + JSON.stringify(est, null, 1));

  const toggle = await page.evaluate(async () => {
    const b = document.getElementById('filter-post');
    if (!b) return 'sin boton';
    const antes = b.classList.contains('active');
    b.click();
    await new Promise(r => setTimeout(r, 150));
    const despues = b.classList.contains('active');
    b.click();
    await new Promise(r => setTimeout(r, 150));
    return { antes, despues, restaurado: b.classList.contains('active') };
  });
  log('TOGGLE LIVE: ' + JSON.stringify(toggle));

  await page.screenshot({ path: 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/live_index_bar.png' });
  log('ERRORES DE SCOPE TOTALES: ' + scopeErrors.length);
  scopeErrors.slice(0, 5).forEach(e => log('   ' + e.slice(0, 180)));
  console.log(scopeErrors.length === 0 ? 'VEREDICTO: OK - cero ReferenceError de p5' : 'VEREDICTO: FALLA');
  await browser.close();
})();
