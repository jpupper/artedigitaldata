// Verifica EN VIVO el importador del editor: panel, buscador, formato y auto-flyer de la convocatoria
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const CONV = '6aa84bda4931621eba633509';

const estado = (p) => p.evaluate(() => {
  let cfg = {};
  try { cfg = window.ParticlesConfig.get(); } catch (e) { }
  const capas = Array.isArray(cfg.TIMELINE_LAYERS) ? cfg.TIMELINE_LAYERS : [];
  return {
    capasTimeline: capas.length,
    clips: capas.reduce((a, l) => a + ((l.clips || []).length), 0),
    imgs: (window.activeImageLayers || []).length,
    base: (window.FSC_VIEWPORT_BASE || null),
    api: window.VEImportador ? Object.keys(window.VEImportador) : null,
  };
});

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 90)));
  await p.goto('https://artedigitaldata.com/visualeffects.html?nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(9000);

  const panel = await p.evaluate(() => {
    const txt = (sel) => { const e = document.querySelector(sel); return e ? (e.textContent || '').trim().slice(0, 24) : null; };
    const btnsFormato = Array.from(document.querySelectorAll('[data-vim-formato], .vim-formato button, .vim-formatos button')).map(e => e.textContent.trim().slice(0, 18));
    return {
      tabs: Array.from(document.querySelectorAll('.vim-tab, [data-vim-tab]')).map(e => e.textContent.trim().slice(0, 16)),
      buscador: !!document.querySelector('.vim-buscador input, #vim-buscar, input[placeholder*="uscar"]'),
      formatos: btnsFormato,
      importarPorId: !!document.querySelector('#importar-id, input[placeholder*="ID"]'),
      lista: !!document.querySelector('.vim-lista, #vim-lista'),
    };
  });
  console.log('panel:', JSON.stringify(panel));
  console.log('antes:', JSON.stringify(await estado(p)));

  // importar la convocatoria (la API la expone el módulo del editor)
  const imp = await p.evaluate(async (id) => {
    const V = window.VEImportador || {};
    const nombres = ['importarConvocatoria', 'convocatoria', 'importarOportunidad', 'generarConvocatoria', 'importarFlyerConvocatoria'];
    for (const n of nombres) {
      if (typeof V[n] === 'function') {
        try { await V[n](id); return { usado: n, ok: true }; }
        catch (e) { return { usado: n, ok: false, error: String(e).slice(0, 160) }; }
      }
    }
    return { usado: null, keys: Object.keys(V) };
  }, CONV);
  console.log('import:', JSON.stringify(imp));
  await p.waitForTimeout(9000);
  console.log('después:', JSON.stringify(await estado(p)));

  // formato: probar el botón 9:16 y ver si cambia la base
  const fmt = await p.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button, [role="button"]')).find(x => /9:16|Vertical/i.test(x.textContent));
    if (b) { b.click(); return b.textContent.trim().slice(0, 20); }
    return null;
  });
  await p.waitForTimeout(2500);
  const est = await estado(p);
  console.log('formato pulsado:', JSON.stringify(fmt), '| base luego:', JSON.stringify(est.base));

  fs.writeFileSync(OUT + 'imp_editor.png', await p.screenshot());
  console.log('errores:', errs.length, errs.slice(0, 3));
  await b.close();
})();
