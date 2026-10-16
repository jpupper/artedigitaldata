// Verifica el widget de fondo inyectando su JS en una página pública del sitio (sin sesión)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 100)));
  await p.goto('https://artedigitaldata.com/404.html?nc=' + Date.now(), { waitUntil: 'load' });
  await p.evaluate(() => new Promise((res) => {
    const s = document.createElement('script');
    s.src = 'js/paginas/fondo-obra-1.js';
    s.onload = res; s.onerror = () => res();
    document.body.appendChild(s);
  }));
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    if (typeof window.fondoObraWidgetHtml !== 'function') return { ok: false, motivo: 'la función no se definió' };
    const html = window.fondoObraWidgetHtml('edit', { fondoShader: 'nodeeditor-8347' });
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    return {
      ok: true,
      tieneInput: !!host.querySelector('#edit-fondo-shader'),
      valorInput: (host.querySelector('#edit-fondo-shader') || {}).value,
      boton: (host.querySelector('[data-fondo-abrir]') || {}).textContent,
      etiqueta: (host.querySelector('#edit-fondo-actual') || {}).textContent,
      botonQuitar: !!host.querySelector('[data-fondo-quitar]'),
      ySinFondo: window.fondoObraWidgetHtml('edit', {}).includes('Sin fondo propio'),
    };
  });
  console.log('widget:', JSON.stringify(r));
  fs.writeFileSync(OUT + 'widget_fondo.png', await p.screenshot());
  console.log('errores:', errs.length, errs.slice(0, 2));
  await b.close();
})();
