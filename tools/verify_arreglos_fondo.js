// Verifica: (1) widget de fondo en el form y en el modal de edición, (2) links públicos en la oportunidad,
// (3) el flyer ya no usa la rotación de letras.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const ID = '6aa84bda4931621eba633509';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const errs = [];

  // 1) create.html: widget presente + el widget funciona con prefijo 'edit'
  const p1 = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p1.on('pageerror', e => errs.push('create: ' + String(e).slice(0, 80)));
  await p1.goto('https://artedigitaldata.com/create.html?nc=' + Date.now(), { waitUntil: 'load' });
  await p1.waitForTimeout(4000);
  const w = await p1.evaluate(() => {
    const html = (typeof window.fondoObraWidgetHtml === 'function') ? window.fondoObraWidgetHtml('edit', { fondoShader: 'nodeeditor-8347' }) : '';
    const visible = Array.from(document.querySelectorAll('button')).some(b => /fondo animado/i.test(b.textContent));
    return {
      funcion: typeof window.fondoObraWidgetHtml,
      inputEnForm: !!document.getElementById('post-fondo-shader'),
      botonVisible: visible,
      tieneInputEdit: html.includes('edit-fondo-shader'),
      htmlEditOk: html.includes('edit-fondo-shader') && html.includes('nodeeditor-8347'),
    };
  });
  console.log('create.html:', JSON.stringify(w));
  await p1.close();

  // 2) oportunidad: links públicos (sin sesión)
  const p2 = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p2.on('pageerror', e => errs.push('opo: ' + String(e).slice(0, 80)));
  await p2.goto('https://artedigitaldata.com/oportunidad.html?id=' + ID + '&nc=' + Date.now(), { waitUntil: 'load' });
  await p2.waitForTimeout(6000);
  const opo = await p2.evaluate(() => {
    const g = document.getElementById('btn-galeria-opo'), f = document.getElementById('btn-flyer-opo');
    const vis = el => !!el && el.offsetParent !== null && getComputedStyle(el).display !== 'none';
    return { galeriaVisible: vis(g), galeriaHref: g && g.getAttribute('href'), flyerVisible: vis(f), flyerHref: f && f.getAttribute('href') };
  });
  console.log('oportunidad (sin sesión):', JSON.stringify(opo));
  fs.writeFileSync(OUT + 'opo_publica.png', await p2.screenshot());
  await p2.close();

  // 3) flyer: el JS servido ya no tiene spin y no fuerza formación
  const js = await (await fetch('https://artedigitaldata.com/js/paginas/flyer-1.js?v=2')).text();
  console.log('flyer-1.js:', JSON.stringify({
    tieneSpin: /spin:\s*true/.test(js),
    fuerzaFormacion: /formationMode:\s*w\.modo\s*\|\|/.test(js),
  }));

  console.log('errores:', errs.length, errs.slice(0, 3));
  await b.close();
})();
