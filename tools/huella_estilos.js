// Huella de estilos: para comparar ANTES/DESPUÉS del refactor (mismo resultado = mismo comportamiento)
const { chromium } = require('playwright');
const fs = require('fs');

const PAGINAS = process.argv[3] ? process.argv[3].split(',') : ['', 'index.html', 'obras.html', 'recursos.html', 'eventos.html',
  'oportunidades.html', 'artistas.html', 'calendario.html', 'search.html', 'quienessomos.html', 'create.html',
  'login.html', 'register.html', 'terminos.html', 'privacidad.html', 'manifiesto.html'];
const BASE = process.argv[2] || 'https://artedigitaldata.com/';
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/huella_' + (process.argv[4] || (BASE.includes('localhost') ? 'despues' : 'antes')) + '.json';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const datos = {};
  for (const p of PAGINAS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 90)));
    await page.goto(BASE + p + (p.includes('?') ? '&' : '?') + 'nc=' + Date.now(), { waitUntil: 'load' }).catch(() => { });
    await page.waitForTimeout(6500);
    const f = await page.evaluate(() => {
      const props = ['backgroundColor', 'color', 'borderTopColor', 'borderTopWidth', 'fontSize', 'fontWeight', 'display',
        'paddingTop', 'paddingLeft', 'marginTop', 'borderRadius', 'opacity', 'backdropFilter',
        'position', 'zIndex', 'top', 'left', 'width', 'height', 'overflow'];
      const out = [];
      const els = [...document.querySelectorAll('body *')].slice(0, 900);
      for (const el of els) {
        const cs = getComputedStyle(el);
        const firma = el.tagName + '|' + String(el.className || '').split(' ').slice(0, 3).join('.') + '|' +
          props.map(k => (cs[k] || '').toString().slice(0, 22)).join(';') + '|' + (el.textContent || '').trim().slice(0, 18);
        out.push(firma);
      }
      return { n: out.length, firmas: out };
    });
    datos[p || 'index'] = { n: f.n, errs, firmas: f.firmas };
    console.log(`${(p || 'index').padEnd(22)} elementos=${f.n} errores=${errs.length}`);
    await page.close();
  }
  fs.writeFileSync(OUT, JSON.stringify(datos));
  console.log('huella -> ' + OUT);
  await browser.close();
})();
