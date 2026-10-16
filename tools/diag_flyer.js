// Diagnóstico: ¿por qué no se ven las palabras del flyer?
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const p = await b.newPage({ viewport: { width: 420, height: 860 } });
  const logs = [];
  p.on('console', (m) => logs.push(m.type() + ': ' + m.text().slice(0, 120)));
  p.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e).slice(0, 140)));
  await p.goto('https://artedigitaldata.com/flyer.html?id=6aa84bda4931621eba633509&t=8&nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(9000);

  const info = await p.evaluate(() => {
    const c = document.querySelector('#p5-canvas canvas') || document.querySelector('canvas');
    const cs = c ? getComputedStyle(c) : null;
    const cont = document.getElementById('p5-canvas');
    const ccs = cont ? getComputedStyle(cont) : null;
    let cfg = {};
    try { cfg = window.ParticlesConfig ? window.ParticlesConfig.get() : {}; } catch (e) { }
    const antes = (window.flyerWordsList || []).length;
    let err = null;
    try {
      window.spawnWordParticles('PRUEBA', 200, 400, true, 'diag1', { fontSize: 40 });
    } catch (e) { err = String(e); }
    return {
      hayCanvas: !!c,
      canvasSize: c ? c.width + 'x' + c.height : null,
      canvasClase: c ? c.className + '|' + c.id : null,
      canvasEstilo: cs ? cs.position + ' z=' + cs.zIndex + ' op=' + cs.opacity + ' disp=' + cs.display : null,
      contEstilo: ccs ? ccs.position + ' z=' + ccs.zIndex + ' w=' + ccs.width + ' h=' + ccs.height : null,
      spawn: typeof window.spawnWordParticles,
      flyerWordsAntes: antes,
      flyerWordsDespues: (window.flyerWordsList || []).length,
      errorSpawn: err,
      cfg: { AUTO_MODE: cfg.AUTO_MODE, LIFESPAN: cfg.COLLAB_WORD_LIFESPAN, TEXT_SIZE: cfg.TEXT_SIZE, FLYER: cfg.FLYER_MODE_ENABLED },
    };
  });
  console.log(JSON.stringify(info, null, 1));
  console.log('--- consola ---');
  logs.slice(-12).forEach((l) => console.log('   ' + l));
  fs.writeFileSync(OUT + 'fly_diag.png', await p.screenshot());
  await b.close();
})();
