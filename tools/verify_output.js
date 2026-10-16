// Verifica SOLO OUTPUT: palabras dibujadas, fotos y sin el error de createVector
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const URL = process.argv[2] || 'https://artedigitaldata.com/outputeffect.html?outputeffect=6acf18419afa278f3c911f80&name=exposici-n-arte-digital-3er-piso-de-dunepark';

const medir = async (p) => {
  const png = await p.screenshot();
  const blancos = await p.evaluate(async (d) => {
    const img = new Image(); await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + d; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
    const dd = cx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < dd.length; i += 4) if (dd[i] > 215 && dd[i + 1] > 215 && dd[i + 2] > 215) n++;
    return n;
  }, png.toString('base64'));
  return { png, blancos };
};

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const p = await b.newPage({ viewport: { width: 420, height: 860 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 110)); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + String(e).slice(0, 110)));
  await p.goto(URL + '&nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(12000);

  for (const [k, espera] of [[0, 0], [1, 7000], [2, 8000], [3, 9000]]) {
    if (espera) await p.waitForTimeout(espera);
    const r = await medir(p);
    fs.writeFileSync(OUT + 'out_' + k + '.png', r.png);
    const est = await p.evaluate(() => {
      let cfg = {}; try { cfg = window.ParticlesConfig.get(); } catch (e) { }
      return { titulo: document.title, imgs: (window.activeImageLayers || []).length, capas: (cfg.TIMELINE_LAYERS || []).length };
    });
    console.log('cap ' + k + ': palabras=' + String(r.blancos).padStart(6) + 'px | imgs=' + est.imgs + ' | capas=' + est.capas);
  }
  const erroresCreate = errs.filter(e => /createVector/.test(e)).length;
  console.log('errores createVector:', erroresCreate, '| otros errores:', errs.length - erroresCreate, errs.filter(e => !/createVector/.test(e)).slice(0, 2));
  await b.close();
})();
