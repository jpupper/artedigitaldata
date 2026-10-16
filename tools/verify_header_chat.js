const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const USUARIO_FAKE = { _id: '000000000000000000000000', username: 'jpupper', nombre: 'jpupper', avatar: '', role: 'USER' };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));

  // 1) a dónde va chat.html
  const p0 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const navs = [];
  p0.on('framenavigated', f => { if (f === p0.mainFrame()) navs.push(f.url()); });
  await p0.goto('https://artedigitaldata.com/chat.html?nc=' + Date.now(), { waitUntil: 'load' });
  await p0.waitForTimeout(6000);
  console.log('CHAT: url final = ' + p0.url() + '\n  navegaciones: ' + navs.join(' -> '));
  const chatInfo = await p0.evaluate(() => ({
    capa: [...document.styleSheets].some(s => (s.href || '').includes('fondo-ui.css')),
    canvas: !!document.getElementById('jpsi-canvas'),
    ascii: !!document.getElementById('ascii-bg-canvas'),
    tieneChat: !!document.querySelector('.chat-messages, #rooms-panel'),
  }));
  console.log('  ' + JSON.stringify(chatInfo));
  // si es la página de chat real, probar el fondo + burbujas
  await p0.close();

  // 2) elementos con radio restantes (completo)
  const p1 = await browser.newPage({ viewport: { width: 1440, height: 940 } });
  await p1.goto('https://artedigitaldata.com/?nc=' + Date.now(), { waitUntil: 'load' });
  await p1.waitForTimeout(8000);
  const radios = await p1.evaluate(() => [...document.querySelectorAll('*')]
    .filter(e => parseFloat(getComputedStyle(e).borderRadius) > 0)
    .map(e => (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + String(e.className || '').split(' ')[0]) + ' = ' + getComputedStyle(e).borderRadius + (e.getAttribute('style') ? ' [inline]' : '')));
  console.log('\nRADIOS RESTANTES (index): ' + radios.length);
  radios.forEach(r => console.log('   ' + r));
  await p1.close();

  // 3) header logueado
  console.log('\n=== HEADER LOGUEADO ===');
  for (const w of [1440, 1366, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addInitScript(u => {
      localStorage.setItem('artedigitaldata_user', JSON.stringify(u));
      localStorage.setItem('artedigitaldata_token', 'fake-token-render');
    }, USUARIO_FAKE);
    const page = await ctx.newPage();
    await page.goto('https://artedigitaldata.com/?nc=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(7000);
    const h = await page.evaluate(() => {
      const r = el => el ? el.getBoundingClientRect() : null;
      const nav = document.querySelector('.ui-nav'), bar = document.querySelector('.ui-header-bar');
      const chances = document.querySelector('.ui-navlink.is-chances');
      const items = [...document.querySelectorAll('.ui-actions > *')].filter(e => r(e).width > 0).map(el => ({
        t: ((el.textContent || '').trim().slice(0, 12) || '(icono)'), h: Math.round(r(el).height), w: Math.round(r(el).width),
        bg: getComputedStyle(el).backgroundColor, col: getComputedStyle(el).color, borde: getComputedStyle(el).borderColor,
      }));
      return {
        logueado: !!document.querySelector('.ui-actions a[href*="profile"]'),
        navCorta: nav ? nav.scrollWidth > nav.clientWidth + 1 : null,
        navSize: nav ? nav.scrollWidth + '/' + nav.clientWidth : null,
        chancesDentro: (chances && bar) ? (r(chances).right <= r(bar).right + 1) : null,
        items,
      };
    });
    console.log(`ancho ${w}: logueado=${h.logueado} navCorta=${h.navCorta} (${h.navSize}) CHANCES dentro=${h.chancesDentro}`);
    h.items.forEach(i => console.log(`    ${i.t.padEnd(12)} alto=${i.h} ancho=${i.w}  bg=${i.bg}  color=${i.col}`));
    if (w === 1366) fs.writeFileSync(OUT + 'header_logueado.png', await page.screenshot({ clip: { x: 0, y: 0, width: 1366, height: 80 } }));
    await ctx.close();
  }
  await browser.close();
})();
