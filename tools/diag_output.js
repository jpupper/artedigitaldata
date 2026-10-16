// Diagnóstico de la página SOLO OUTPUT
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const URL = 'https://artedigitaldata.com/outputeffect.html?outputeffect=6acf18419afa278f3c911f80&name=exposici-n-arte-digital-3er-piso-de-dunepark';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const logs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 160)); });
  p.on('pageerror', e => logs.push('PAGEERROR: ' + String(e).slice(0, 200)));
  p.on('response', r => { if (r.status() >= 400) logs.push('HTTP ' + r.status() + ' ' + r.url().slice(-70)); });
  await p.goto(URL + '&nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(14000);
  const estado = await p.evaluate(() => {
    let cfg = {};
    try { cfg = window.ParticlesConfig ? window.ParticlesConfig.get() : {}; } catch (e) { }
    return {
      titulo: document.title,
      url: location.search.slice(0, 90),
      fscProyecto: window.FSC_PROYECTO_ID || null,
      outputId: (window.OUTPUT_EFFECT_ID || window.outputEffectId || null),
      canvases: document.querySelectorAll('canvas').length,
      imgs: (window.activeImageLayers || []).length,
      palabras: (typeof particles !== 'undefined' && particles.length) || null,
      capas: (cfg.TIMELINE_LAYERS || []).length,
      bodyClase: document.body.className.slice(0, 60),
      texto: (document.body.innerText || '').trim().slice(0, 80),
    };
  });
  console.log(JSON.stringify(estado, null, 1));
  console.log('--- errores/avisos ---');
  logs.slice(0, 12).forEach(l => console.log('  ' + l));
  fs.writeFileSync(OUT + 'output_diag.png', await p.screenshot());
  await b.close();
})();
