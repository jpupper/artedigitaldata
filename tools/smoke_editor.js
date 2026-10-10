// Smoke test del editor (visualeffects.html) en local: que el gate no rompa el click/drag
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });

  await page.goto('http://localhost:8899/visualeffects.html', { waitUntil: 'domcontentloaded' });
  // clicks antes de que arranque p5
  await page.mouse.move(700, 400); await page.mouse.click(700, 400);
  await page.waitForTimeout(300);

  let ready = null;
  for (let i = 0; i < 40; i++) {
    ready = await page.evaluate(() => (typeof window.p5EffectReady === 'function' ? window.p5EffectReady() : 'sin fn')).catch(() => 'ctx');
    if (ready === true) break;
    await page.waitForTimeout(500);
  }
  console.log('editor: sketchReady=' + ready);

  const antes = await page.evaluate(() => (typeof window.getWordIndex === 'function' ? window.getWordIndex() : null));
  await page.mouse.move(600, 300);
  await page.mouse.click(600, 300);
  await page.waitForTimeout(600);
  const despues = await page.evaluate(() => (typeof window.getWordIndex === 'function' ? window.getWordIndex() : null));
  console.log(`editor: click spawnea palabra -> ${antes} => ${despues} (${antes !== despues ? 'OK' : 'SIN CAMBIO'})`);

  const est = await page.evaluate(() => ({
    appMode: window.appMode || null,
    moduloParticulas: typeof window.ParticlesConfig,
    getWordIndex: typeof window.getWordIndex,
    addFlyerWordAt: typeof window.addFlyerWordAt,
    floor: typeof window.floor,
  }));
  console.log('editor estado: ' + JSON.stringify(est));

  const scope = errores.filter(e => /floor|not defined|ReferenceError/.test(e));
  console.log('errores de scope: ' + scope.length + ' (total errores consola: ' + errores.length + ')');
  scope.slice(0, 5).forEach(e => console.log('   ' + e.slice(0, 180)));
  await browser.close();
})();
