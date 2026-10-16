// Verificación amplia: fondo por sección, elementos con radio, header logueado
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';

const USUARIO_FAKE = { _id: '000000000000000000000000', username: 'jpupper', nombre: 'jpupper', avatar: '', role: 'USER' };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));

  // ---------- 1) fondo por sección ----------
  console.log('=== FONDO POR SECCIÓN ===');
  const PAGINAS = ['', 'obras.html', 'eventos.html', 'oportunidades.html', 'chat.html', 'admin.html', 'profile.html?user=jpupper'];
  for (const p of PAGINAS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 90)));
    await page.goto('https://artedigitaldata.com/' + p + (p.includes('?') ? '&' : '?') + 'nc=' + Date.now(), { waitUntil: 'load' }).catch(() => { });
    await page.waitForTimeout(p.startsWith('chat') ? 7000 : 8000);
    const info = await page.evaluate(() => {
      const jc = document.getElementById('jpsi-canvas');
      return {
        url: location.pathname,
        canvas: !!jc, z: jc ? getComputedStyle(jc).zIndex : null, op: jc ? getComputedStyle(jc).opacity : null,
        asciiViejo: !!document.getElementById('ascii-bg-canvas'),
        capa: [...document.styleSheets].some(s => (s.href || '').includes('fondo-ui.css')),
        listo: window.JPShaderInclude && window.JPShaderInclude.state ? window.JPShaderInclude.state().ready : null,
        fuente: window.JPShaderInclude && window.JPShaderInclude.state ? (window.JPShaderInclude.state().valor || window.JPShaderInclude.state().comp) : null,
        bodyBg: getComputedStyle(document.body).backgroundColor,
      };
    });
    const png = await page.screenshot({ clip: { x: 1150, y: 300, width: 220, height: 110 } });
    const pix = await page.evaluate(async (data) => {
      const img = new Image(); await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + data; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height).data;
      let s = 0, col = 0, n = d.length / 4;
      for (let i = 0; i < d.length; i += 4) { s += d[i] + d[i + 1] + d[i + 2]; if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 12) col++; }
      return { brillo: +(s / n / 3).toFixed(1), col: +(100 * col / n).toFixed(1) };
    }, png.toString('base64'));
    const ok = info.canvas && !info.asciiViejo && info.listo && (pix.col > 2 || pix.brillo > 25);
    console.log(`${(p || 'index').padEnd(22)} ${ok ? '✅' : '⚠️ '} canvas=${info.canvas} asciiViejo=${info.asciiViejo} capa=${info.capa} listo=${info.listo} fuente=${info.fuente} pantalla(brillo=${pix.brillo},color=${pix.col}%) err=${errs.length}`);
    await page.close();
  }

  // ---------- 2) elementos con radio (index) ----------
  console.log('\n=== ELEMENTOS CON RADIO (index) ===');
  const p2 = await browser.newPage({ viewport: { width: 1440, height: 940 } });
  await p2.goto('https://artedigitaldata.com/?nc=' + Date.now(), { waitUntil: 'load' });
  await p2.waitForTimeout(8000);
  const radios = await p2.evaluate(() => [...document.querySelectorAll('*')]
    .filter(e => parseFloat(getComputedStyle(e).borderRadius) > 0)
    .map(e => ({ tag: e.tagName, cls: String(e.className || '').slice(0, 55), id: e.id || '', r: getComputedStyle(e).borderRadius, inline: (e.getAttribute('style') || '').slice(0, 40) })));
  console.log(JSON.stringify(radios.slice(0, 16), null, 1));
  await p2.close();

  // ---------- 3) header LOGUEADO a 3 anchos ----------
  console.log('\n=== HEADER LOGUEADO ===');
  for (const w of [1440, 1366, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addInitScript(u => {
      localStorage.setItem('artedigitaldata_user', JSON.stringify(u));
      localStorage.setItem('artedigitaldata_token', 'fake-token-para-render');
    }, USUARIO_FAKE);
    const page = await ctx.newPage();
    await page.goto('https://artedigitaldata.com/?nc=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(7000);
    const h = await page.evaluate(() => {
      const r = el => el ? el.getBoundingClientRect() : null;
      const nav = document.querySelector('.ui-nav');
      const bar = document.querySelector('.ui-header-bar');
      const acciones = document.querySelector('.ui-actions');
      const items = [...document.querySelectorAll('.ui-actions > *')].map(el => ({
        t: (el.textContent || '').trim().slice(0, 12) || '(icono)', h: Math.round(r(el).height), w: Math.round(r(el).width),
        bg: getComputedStyle(el).backgroundColor, col: getComputedStyle(el).color,
      }));
      const chances = document.querySelector('.ui-navlink.is-chances');
      return {
        logueado: !!document.querySelector('.ui-actions a[href*="profile"]'),
        navCorta: nav ? nav.scrollWidth > nav.clientWidth + 1 : null,
        navScroll: nav ? nav.scrollWidth + '/' + nav.clientWidth : null,
        chancesDentro: (chances && bar) ? (r(chances).right <= r(bar).right + 1) : null,
        items,
      };
    });
    console.log(`ancho ${w}: logueado=${h.logueado} navCorta=${h.navCorta} (${h.navScroll}) chancesDentro=${h.chancesDentro}`);
    h.items.forEach(i => console.log(`    ${i.t.padEnd(12)} alto=${i.h} ancho=${i.w} bg=${i.bg} color=${i.col}`));
    if (w === 1366) fs.writeFileSync(OUT + 'header_logueado.png', await page.screenshot({ clip: { x: 0, y: 0, width: 1366, height: 80 } }));
    await ctx.close();
  }
  await browser.close();
})();
