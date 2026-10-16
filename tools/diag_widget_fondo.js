// Diagnóstico: por qué no está window.fondoObraWidgetHtml en create.html
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const logs = [];
  p.on('console', m => logs.push(m.type() + ': ' + m.text().slice(0, 140)));
  p.on('pageerror', e => logs.push('PAGEERROR: ' + String(e).slice(0, 200)));
  p.on('requestfailed', r => logs.push('FALLO: ' + r.url().slice(-60) + ' ' + (r.failure() || {}).errorText));
  await p.goto('https://artedigitaldata.com/create.html?nc=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  const info = await p.evaluate(() => {
    const s = Array.from(document.querySelectorAll('script')).map(x => x.getAttribute('src')).filter(Boolean);
    return {
      widget: typeof window.fondoObraWidgetHtml,
      scriptsFondo: s.filter(x => /fondo-obra/.test(x)),
      formEnDom: !!document.querySelector('#post-fondo-shader, [id$="-fondo-shader"]'),
      idsFondo: Array.from(document.querySelectorAll('[id*="fondo"]')).map(e => e.id).slice(0, 8),
      botonesFondo: Array.from(document.querySelectorAll('button')).filter(b => /fondo/i.test(b.textContent)).map(b => b.textContent.trim().slice(0, 30)),
    };
  });
  console.log(JSON.stringify(info, null, 1));
  console.log('--- consola ---');
  logs.slice(0, 14).forEach(l => console.log('  ' + l));
  await b.close();
})();
