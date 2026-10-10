// Prueba dura: si p5.min.js NO carga (o el `load` tarda), los clicks tempranos
// tienen que ser inofensivos. Antes del fix tiraban ReferenceError: floor is not defined.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // Bloquear p5 (simula que el sketch todavia no arranco / no va a arrancar)
  await page.route('**/p5.min.js', (r) => r.abort());

  await page.goto(process.argv[2] || 'http://localhost:8899/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const estado = await page.evaluate(() => ({
    floorGlobal: typeof window.floor,
    setup: typeof window.setup,
    p5EffectReady: typeof window.p5EffectReady === 'function' ? window.p5EffectReady() : 'sin fn',
    p5Definido: typeof window.p5,
  }));
  console.log('SIN P5 -> ' + JSON.stringify(estado));

  // clicks y movimientos con p5 ausente
  for (const [x, y] of [[640, 780], [500, 820], [800, 700]]) {
    await page.mouse.move(x - 40, y - 40);
    await page.mouse.move(x, y);
    await page.mouse.click(x, y);
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(500);

  console.log('ERRORES con p5 bloqueado: ' + errors.length);
  errors.slice(0, 6).forEach(e => console.log('   ' + e.slice(0, 200)));
  const ok = errors.filter(e => /floor|not defined|ReferenceError/.test(e));
  console.log(ok.length === 0 ? 'RESULTADO: OK (ningun ReferenceError de p5)' : 'RESULTADO: FALLA -> ' + ok.length + ' errores de scope');
  await browser.close();
})();
