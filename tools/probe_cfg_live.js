const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('console', (m) => { const t = m.text(); if (/Front VisualEffect|secuencia|front/i.test(t)) console.log('CONSOLA: ' + t.slice(0, 160)); });
  await page.goto('https://artedigitaldata.com/?nc=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(8000);
  const dump = await page.evaluate(() => {
    const g = window.ParticlesConfig.get();
    const out = {};
    for (const k of Object.keys(g)) {
      const v = g[k];
      if (Array.isArray(v)) out[k] = '[' + v.length + ' items] ' + JSON.stringify(v.slice(0, 3));
      else if (v && typeof v === 'object') out[k] = JSON.stringify(v).slice(0, 120);
      else out[k] = v;
    }
    return out;
  });
  const claves = ['COLOR_1', 'COLOR_2', 'COLOR_3', 'COLOR_4', 'FORCE_WHITE_WORDS', 'P5_FONT', 'CHAR_COLOR', 'TEXT_COLOR', 'FRONT_', 'FONT'];
  console.log('--- claves relevantes del CFG en vivo ---');
  for (const k of Object.keys(dump)) {
    if (claves.some(c => k.includes(c)) || /COLOR|FONT|FRONT|WORD/.test(k)) console.log(`  ${k} = ${JSON.stringify(dump[k])}`);
  }
  console.log('--- todas las claves ---');
  console.log(Object.keys(dump).join(', '));
  await browser.close();
})();
