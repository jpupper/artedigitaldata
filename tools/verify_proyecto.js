// Verifica el proyecto guardado: (1) reproduce imágenes+palabras por timeline, (2) se abre en el editor
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const ID = process.argv[2] || '6acef4267e2dfebc537d3ddd';

const estadoImagenes = (p) => p.evaluate(() => ({
  capas: (window.activeImageLayers || []).length,
  visibles: (window.activeImageLayers || []).filter(i => i.visible !== false).map(i => i.name || i.id),
  palabrasCanvas: !!document.querySelector('#p5-canvas canvas'),
  fondo: !!document.getElementById('jpsi-canvas'),
}));

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const errs = [];

  // ── 1) reproductor ──────────────────────────────────────────────────────
  const p1 = await b.newPage({ viewport: { width: 420, height: 860 } });
  p1.on('pageerror', e => errs.push('reproductor: ' + String(e).slice(0, 90)));
  p1.on('console', m => { if (m.type() === 'error') errs.push('consola: ' + m.text().slice(0, 90)); });
  await p1.goto('https://artedigitaldata.com/flyer.html?proyecto=' + ID + '&nc=' + Date.now(), { waitUntil: 'load' });
  await p1.waitForTimeout(8000);
  console.log('arranque:', JSON.stringify(await estadoImagenes(p1)));
  for (const [espera, nombre] of [[3000, 'a'], [5000, 'b'], [6000, 'c']]) {
    await p1.waitForTimeout(espera);
    const est = await estadoImagenes(p1);
    fs.writeFileSync(OUT + 'proy_' + nombre + '.png', await p1.screenshot());
    console.log('  t+' + nombre + ':', JSON.stringify(est));
  }
  await p1.close();

  // ── 2) editor ───────────────────────────────────────────────────────────
  const p2 = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p2.on('pageerror', e => errs.push('editor: ' + String(e).slice(0, 90)));
  await p2.goto('https://artedigitaldata.com/visualeffects.html?id=' + ID + '&nc=' + Date.now(), { waitUntil: 'load' });
  await p2.waitForTimeout(9000);
  const ed = await p2.evaluate(() => {
    const filas = Array.from(document.querySelectorAll('.timeline-track-row .track-label-span')).map(e => e.textContent);
    const pista = document.querySelector('.timeline-track-row .timeline-drop-zone, .timeline-track-row .clip, .timeline-track-row');
    return {
      capasEnLaTimeline: filas,
      clipsDibujados: document.querySelectorAll('.timeline-track-row .timeline-clip, .timeline-track-row .tl-clip').length,
      duracion: (document.getElementById('tl-time-readout') || {}).textContent,
      imgsEditor: (window.activeImageLayers || []).length,
      tienePista: !!pista,
    };
  });
  console.log('editor:', JSON.stringify(ed));
  fs.writeFileSync(OUT + 'proy_editor.png', await p2.screenshot());
  await p2.close();

  console.log('errores:', errs.length, errs.slice(0, 4));
  await b.close();
})();
